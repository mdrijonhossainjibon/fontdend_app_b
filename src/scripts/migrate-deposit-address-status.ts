import { connectDB } from '@/config';
import { DepositAddress } from '@/models/DepositAddress';

async function migrateDepositAddressStatus() {
  await connectDB();
  console.log('Connected to DB');

  // Convert isActive: true -> status: 'active', isActive: false -> status: 'inactive'
  const result = await DepositAddress.updateMany(
    { status: { $exists: false }, isActive: { $exists: true } },
    [{ $set: { status: { $cond: ['$isActive', 'active', 'inactive'] } } }]
  );
  console.log(`Updated ${result.modifiedCount} documents (isActive -> status)`);

  // Remove old isActive field
  const unsetResult = await DepositAddress.updateMany(
    { isActive: { $exists: true } },
    { $unset: { isActive: '' } }
  );
  console.log(`Cleaned isActive field from ${unsetResult.modifiedCount} documents`);

  console.log('Migration complete');
  process.exit(0);
}

migrateDepositAddressStatus().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
