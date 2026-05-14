import mongoose from 'mongoose'

const SystemSettingSchema = new mongoose.Schema({
    // General
    platformName: { type: String, default: "SparkAI" },
    supportEmail: { type: String, default: "support@sparkai.com" },
    maxApiRateLimit: { type: String, default: "1000 req/min" },

    // Wallet Configuration
    mainWalletAddress: { type: String, default: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" },

    // Security
    twoFARequired: { type: Boolean, default: true },
    ipWhitelist: { type: Boolean, default: false },
    sessionTimeout: { type: String, default: "30 minutes" },

    updatedAt: { type: Date, default: Date.now }
})

export const SystemSetting = mongoose.models.SystemSetting || mongoose.model('SystemSetting', SystemSettingSchema)
