import { connectDB } from '@/config';
import { Deposit } from '@/models/Deposit';

async function cleanupZeroAmountDeposits() {
  await connectDB();
  console.log('Connected to DB');

  // Delete deposits where amount is 0 and no matching Transaction exists
  const result = await Deposit.deleteMany({ amount: 0 });
  console.log(`Deleted ${result.deletedCount} zero-amount deposits`);

  console.log('Cleanup complete');
  process.exit(0);
}

cleanupZeroAmountDeposits().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
