import mongoose from 'mongoose';
import { PromoCode } from './src/models/PromoCode';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/captchamaster';

const codes = [
  { code: 'WELCOME100', credits: 100, maxUses: 1000 },
  { code: 'BONUS500', credits: 500, maxUses: 500 },
  { code: 'FREECREDITS', credits: 200, maxUses: 300 },
  { code: 'VIP1000', credits: 1000, maxUses: 100 },
  { code: 'TEST50', credits: 50, maxUses: 9999 },
  { code: 'STARTER', credits: 150, maxUses: 500 },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  for (const c of codes) {
    await PromoCode.findOneAndUpdate(
      { code: c.code },
      { $setOnInsert: { ...c, expiresAt: null, isActive: true, currentUses: 0 } },
      { upsert: true }
    );
    console.log(`  ${c.code}: ${c.credits} credits, ${c.maxUses} max uses`);
  }

  console.log('Done! Promo codes seeded.');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
