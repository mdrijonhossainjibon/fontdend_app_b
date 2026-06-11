/**
 * Migration: CryptoConfig isActive → status (active/inactive)
 *
 * Run: npx ts-node --transpile-only -r tsconfig-paths/register src/scripts/migrate-crypto-status.ts
 * Or after build: node dist/scripts/migrate-crypto-status.js
 */

import mongoose from 'mongoose';
import { env } from '../config/env';

async function migrate() {
  const uri = env.MONGO_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/captchamaster';
  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  const db = mongoose.connection.db!;

  // Update coin-level isActive → status
  const coinResult = await db.collection('cryptoconfigs').updateMany(
    { isActive: { $exists: true } },
    [
      {
        $set: {
          status: {
            $cond: [{ $eq: ['$isActive', true] }, 'active', 'inactive'],
          },
        },
      },
      { $unset: 'isActive' },
    ]
  );
  console.log(`✅ Coin-level: ${coinResult.modifiedCount} documents migrated`);

  // Update network-level isActive → status inside arrays
  const netResult = await db.collection('cryptoconfigs').updateMany(
    { 'networks.isActive': { $exists: true } },
    [
      {
        $set: {
          networks: {
            $map: {
              input: '$networks',
              as: 'net',
              in: {
                $mergeObjects: [
                  '$$net',
                  {
                    status: {
                      $cond: [{ $eq: ['$$net.isActive', true] }, 'active', 'inactive'],
                    },
                  },
                ],
              },
            },
          },
        },
      },
    ]
  );
  console.log(`✅ Network-level: ${netResult.modifiedCount} documents migrated`);

  // Remove network-level isActive field
  const netCleanResult = await db.collection('cryptoconfigs').updateMany(
    {},
    { $unset: { 'networks.$[].isActive': '' } }
  );
  console.log(`✅ Network isActive field cleaned: ${netCleanResult.modifiedCount} documents`);

  console.log('\n🎉 Migration complete!');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
