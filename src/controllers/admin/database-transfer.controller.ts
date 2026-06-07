import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

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
 * Transfers selected databases from source to target using pure MongoDB driver
 */
export const transferDatabases = async (req: Request, res: Response) => {
  try {
    const { target, databases } = req.body;

    if (!target || !target.host) {
      return res.status(400).json({ success: false, error: 'Target host is required' });
    }
    if (!databases || !Array.isArray(databases) || databases.length === 0) {
      return res.status(400).json({ success: false, error: 'Database names array is required' });
    }

    // Get source URI from current mongoose connection
    const sourceUri = getSourceUri();
    if (!sourceUri) {
      return res.status(503).json({ success: false, error: 'Source MONGO_URI not configured' });
    }

    // Build target URI
    const targetPort = target.port || 27017;
    const authDb = target.authDb || 'admin';
    let targetUri: string;
    if (target.user && target.password) {
      targetUri = `mongodb://${encodeURIComponent(target.user)}:${encodeURIComponent(target.password)}@${target.host}:${targetPort}/admin?authSource=${authDb}`;
    } else {
      targetUri = `mongodb://${target.host}:${targetPort}/admin`;
    }

    // Connect to target
    let targetClient: MongoClient;
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

    // Transfer each database
    const results: { db: string; status: string; error?: string }[] = [];

    for (const dbName of databases) {
      try {
        await transferDatabase(dbName, targetClient);
        results.push({ db: dbName, status: 'success' });
      } catch (err: any) {
        results.push({ db: dbName, status: 'failed', error: err.message });
      }
    }

    await targetClient.close();

    const failed = results.filter(r => r.status === 'failed');
    return res.json({
      success: failed.length === 0,
      results,
      summary: {
        total: databases.length,
        succeeded: results.filter(r => r.status === 'success').length,
        failed: failed.length,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

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

async function transferDatabase(dbName: string, targetClient: MongoClient): Promise<void> {
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

    for (const collName of collectionNames) {
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
            batch = [];
          }
        }
      }

      // Insert remaining docs
      if (batch.length > 0) {
        await targetDb.collection(collName).insertMany(batch, { ordered: false });
      }
    }
  } finally {
    await sourceClient.close();
  }
}
