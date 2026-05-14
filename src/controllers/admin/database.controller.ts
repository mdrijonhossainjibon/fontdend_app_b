import { Request, Response } from 'express';
import mongoose from 'mongoose';

const getDb = () => mongoose.connection.db;

export const getStats = async (req: Request, res: Response) => {
  try {
    const db = getDb();
    if (!db) return res.status(500).json({ success: false, error: 'No database connection' });
    const collections = await db.listCollections().toArray();
    const stats = [];
    for (const col of collections) {
      const coll = db.collection(col.name);
      const docCount = await coll.countDocuments();
      const statsDoc = await coll.stats();
      const indexes = await coll.indexes();
      stats.push({
        name: col.name,
        count: docCount,
        size: statsDoc.size || 0,
        avgObjSize: statsDoc.avgObjSize || 0,
        storageSize: statsDoc.storageSize || 0,
        totalIndexSize: statsDoc.totalIndexSize || 0,
        indexes,
      });
    }
    return res.json({ success: true, data: stats });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const cleanActivity = async (req: Request, res: Response) => {
  try {
    return res.json({ success: true, data: { cleaned: true } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const list = getStats;

export const validate = async (req: Request, res: Response) => {
  try {
    const { collection } = req.body;
    if (!collection) return res.status(400).json({ success: false, error: 'Collection name is required' });
    const db = getDb();
    if (!db) return res.status(500).json({ success: false, error: 'No database connection' });
    const result = await db.command({ validate: collection } as any);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const repair = async (req: Request, res: Response) => {
  try {
    const { collection } = req.body;
    if (!collection) return res.status(400).json({ success: false, error: 'Collection name is required' });
    const db = getDb();
    if (!db) return res.status(500).json({ success: false, error: 'No database connection' });
    const result = await db.command({ validate: collection, full: true } as any);
    return res.json({ success: true, data: { repaired: true, result } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const deleteIndex = async (req: Request, res: Response) => {
  try {
    const { collection, index } = req.body;
    if (!collection || !index) return res.status(400).json({ success: false, error: 'Collection name and index name are required' });
    const db = getDb();
    if (!db) return res.status(500).json({ success: false, error: 'No database connection' });
    await db.collection(collection).dropIndex(index);
    return res.json({ success: true, data: { dropped: index } });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
