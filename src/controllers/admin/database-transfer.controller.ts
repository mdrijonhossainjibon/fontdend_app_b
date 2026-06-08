import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import crypto from 'crypto';

// ─── In-memory transfer progress store ───
interface CollectionProgress {
  name: string;
  docsTotal: number;
  docsTransferred: number;
}

interface DbProgress {
  name: string;
  status: 'pending' | 'transferring' | 'completed' | 'failed';
  collections: CollectionProgress[];
  currentCollection: string;
  error?: string;
  bytesTransferred: number;
}

interface TransferProgress {
  transferId: string;
  status: 'running' | 'completed' | 'failed';
  databases: DbProgress[];
  currentDb: string;
  totalDbs: number;
  completedDbs: number;
  startTime: number;
  summary?: { total: number; succeeded: number; failed: number };
}

const transferProgressMap = new Map<string, TransferProgress>();

/**
 * GET /api/admin/database/info
 * Returns current server's MongoDB connection info (auto-detected)
 */
export const getDbInfo = async (req: Request, res: Response) => {
  try {
    const conn = mongoose.connection;
    if (!conn || !conn.db) {
      return res.status(503).json({ success: false, error: 'No database connection' });
    }

    // Parse MONGO_URI to extract host, port, db name
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI || '';
    let host = conn.host || 'localhost';
    let port = 27017;
    let dbName = conn.name || 'main_backend';

    // Try to parse from URI for more accurate info
    if (uri) {
      try {
        const url = new URL(uri.replace('mongodb+srv://', 'mongodb://').replace('mongodb://', 'http://'));
        host = url.hostname || host;
        port = parseInt(url.port || '27017', 10);
        dbName = url.pathname.replace('/', '') || dbName;
      } catch { /* fallback to mongoose connection info */ }
    }

    // Get MongoDB version
    let version: string | undefined;
    try {
      const buildInfo = await conn.db.admin().command({ buildInfo: 1 } as any);
      version = buildInfo.version;
    } catch { /* version not available */ }

    return res.json({
      success: true,
      host,
      port,
      dbName,
      version,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/admin/database/connect
 * Validates target connection and returns source server's database list
 */
export const connectTarget = async (req: Request, res: Response) => {
  try {
    const { target } = req.body;
    if (!target || !target.host) {
      return res.status(400).json({ success: false, error: 'Target host is required' });
    }

    // Get source host from current mongoose connection
    const sourceHost = mongoose.connection.host || '';
    if (sourceHost && (sourceHost === target.host || sourceHost === `127.0.0.1` || sourceHost === `localhost`)) {
      return res.status(400).json({ success: false, error: 'Source and Target servers cannot be the same' });
    }

    // Build target MongoDB URI
    const targetPort = target.port || 27017;
    const authDb = target.authDb || 'admin';
    let targetUri: string;

    if (target.user && target.password) {
      targetUri = `mongodb://${encodeURIComponent(target.user)}:${encodeURIComponent(target.password)}@${target.host}:${targetPort}/admin?authSource=${authDb}`;
    } else {
      targetUri = `mongodb://${target.host}:${targetPort}/admin`;
    }

    // Test connection to target
    let targetClient: MongoClient | null = null;
    try {
      targetClient = new MongoClient(targetUri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });
      await targetClient.connect();
    } catch (err: any) {
      return res.status(502).json({
        success: false,
        error: `Cannot connect to target server: ${err.message}`,
      });
    }

    // Close target connection
    await targetClient.close();

    // Get databases from SOURCE server
    const db = mongoose.connection.db;
    if (!db) {
      return res.status(503).json({ success: false, error: 'No source database connection' });
    }

    // List all databases from source
    let dbs: { name: string; size?: string; collections?: number }[] = [];

    try {
      const adminDb = db.admin();
      const dbList = await adminDb.listDatabases();

      dbs = await Promise.all(
        dbList.databases
          .filter((d: any) => d.name !== 'admin' && d.name !== 'local' && d.name !== 'config')
          .map(async (d: any) => {
            try {
              const sourceDb = mongoose.connection.useDb(d.name);
              const collections = await sourceDb.db.listCollections().toArray();
              const collCount = collections.length;

              let sizeStr: string | undefined;
              if (d.sizeOnDisk) {
                sizeStr = formatBytes(d.sizeOnDisk);
              }

              return { name: d.name, size: sizeStr, collections: collCount };
            } catch {
              return { name: d.name, collections: 0 };
            }
          })
      );
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Failed to list databases: ${err.message}`,
      });
    }

    return res.json({
      success: true,
      databases: dbs,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/admin/database/transfer
 * Starts async transfer, returns transferId immediately. Poll GET /progress/:id for updates.
 */
export const transferDatabases = async (req: Request, res: Response) => {
  try {
    const { target, databases } = req.body;

    if (!target || !target.host) {
      return res.status(400).json({ success: false, error: 'Target host is required' });
    }

    // Reject if source and target are the same server
    const sourceHost = mongoose.connection.host || '';
    if (sourceHost && (sourceHost === target.host || sourceHost === `127.0.0.1` || sourceHost === `localhost`)) {
      return res.status(400).json({ success: false, error: 'Source and Target servers cannot be the same' });
    }

    if (!databases || !Array.isArray(databases) || databases.length === 0) {
      return res.status(400).json({ success: false, error: 'Database names array is required' });
    }

    const sourceUri = getSourceUri();
    if (!sourceUri) {
      return res.status(503).json({ success: false, error: 'Source MONGO_URI not configured' });
    }

    // Create progress entry
    const transferId = crypto.randomBytes(8).toString('hex');
    const progress: TransferProgress = {
      transferId,
      status: 'running',
      databases: databases.map(name => ({
        name,
        status: 'pending',
        collections: [],
        currentCollection: '',
        bytesTransferred: 0,
      })),
      currentDb: '',
      totalDbs: databases.length,
      completedDbs: 0,
      startTime: Date.now(),
    };
    transferProgressMap.set(transferId, progress);

    // Run transfer in background
    runTransferInBackground(target, databases, transferId);

    return res.json({
      success: true,
      transferId,
      message: 'Transfer started',
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/admin/database/progress/:transferId
 * Returns current transfer progress
 */
export const getTransferProgress = async (req: Request, res: Response) => {
  const { transferId } = req.params;
  const progress = transferProgressMap.get(transferId);
  if (!progress) {
    return res.status(404).json({ success: false, error: 'Transfer not found or expired' });
  }

  // Auto-cleanup after 5 min of completion/failure
  if (progress.status !== 'running') {
    setTimeout(() => transferProgressMap.delete(transferId), 5 * 60 * 1000);
  }

  return res.json({ success: true, progress });
};

// ─── Background transfer runner ───

async function runTransferInBackground(target: any, databases: string[], transferId: string) {
  const progress = transferProgressMap.get(transferId)!;

  const targetPort = target.port || 27017;
  const authDb = target.authDb || 'admin';
  let targetUri: string;
  if (target.user && target.password) {
    targetUri = `mongodb://${encodeURIComponent(target.user)}:${encodeURIComponent(target.password)}@${target.host}:${targetPort}/admin?authSource=${authDb}`;
  } else {
    targetUri = `mongodb://${target.host}:${targetPort}/admin`;
  }

  let targetClient: MongoClient;
  try {
    targetClient = new MongoClient(targetUri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
    await targetClient.connect();
  } catch (err: any) {
    progress.status = 'failed';
    databases.forEach((_, i) => {
      progress.databases[i].status = 'failed';
      progress.databases[i].error = err.message;
    });
    return;
  }

  for (let i = 0; i < databases.length; i++) {
    const dbName = databases[i];
    progress.currentDb = dbName;
    progress.databases[i].status = 'transferring';

    try {
      await transferDatabase(dbName, targetClient, transferId);
      progress.databases[i].status = 'completed';
      progress.completedDbs++;
    } catch (err: any) {
      progress.databases[i].status = 'failed';
      progress.databases[i].error = err.message;
    }
  }

  await targetClient.close();

  const total = databases.length;
  const succeeded = progress.databases.filter(d => d.status === 'completed').length;
  const failed = progress.databases.filter(d => d.status === 'failed').length;
  progress.status = failed === 0 ? 'completed' : failed === total ? 'failed' : 'completed';
  progress.summary = { total, succeeded, failed };
}

// ─── Helpers ──────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

const BATCH_SIZE = 500;

function getSourceUri(): string | null {
  return process.env.MONGO_URI || process.env.MONGODB_URI || null;
}

async function transferDatabase(dbName: string, targetClient: MongoClient, transferId?: string): Promise<void> {
  const progress = transferId ? transferProgressMap.get(transferId) : undefined;
  // Connect source client explicitly so we can access any database
  const sourceUri = getSourceUri()!;
  const sourceClient = new MongoClient(sourceUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  try {
    await sourceClient.connect();
    const sourceDb = sourceClient.db(dbName);
    const targetDb = targetClient.db(dbName);

    // Get all collections from source
    const collections = await sourceDb.listCollections().toArray();
    const collectionNames = collections
      .map((c: any) => c.name)
      .filter((name: string) => !name.startsWith('system.'));

    // Init progress for this db
    if (progress) {
      const dbProg = progress.databases.find(d => d.name === dbName);
      if (dbProg) {
        dbProg.collections = collectionNames.map(name => ({ name, docsTotal: 0, docsTransferred: 0 }));
      }
    }

    for (const collName of collectionNames) {
      // Update current collection in progress
      if (progress) {
        const dbProg = progress.databases.find(d => d.name === dbName);
        if (dbProg) dbProg.currentCollection = collName;
      }

      // Drop existing collection on target (like mongorestore --drop)
      try {
        await targetDb.collection(collName).drop();
      } catch { /* collection may not exist */ }

      // Stream documents in batches
      const cursor = sourceDb.collection(collName).find().batchSize(BATCH_SIZE);
      let batch: any[] = [];
      let totalDocs = 0;

      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (doc) {
          batch.push(doc);
          totalDocs++;

          if (batch.length >= BATCH_SIZE) {
            if (batch.length > 0) {
              await targetDb.collection(collName).insertMany(batch, { ordered: false });
            }

            // Update docs transferred
            if (progress) {
              const dbProg = progress.databases.find(d => d.name === dbName);
              if (dbProg) {
                const colProg = dbProg.collections.find(c => c.name === collName);
                if (colProg) {
                  colProg.docsTransferred += batch.length;
                  colProg.docsTotal = totalDocs;
                }
              }
            }

            batch = [];
          }
        }
      }

      // Insert remaining docs
      if (batch.length > 0) {
        await targetDb.collection(collName).insertMany(batch, { ordered: false });
      }

      // Final doc count for this collection
      if (progress) {
        const dbProg = progress.databases.find(d => d.name === dbName);
        if (dbProg) {
          const colProg = dbProg.collections.find(c => c.name === collName);
          if (colProg) {
            colProg.docsTotal = totalDocs;
            colProg.docsTransferred = totalDocs;
          }
          dbProg.bytesTransferred += 1;
        }
      }
    }
  } finally {
    await sourceClient.close();
  }
}
