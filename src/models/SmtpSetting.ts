import mongoose from 'mongoose'

const SmtpSettingSchema = new mongoose.Schema({
    host: { type: String, required: true },
    port: { type: Number, required: true, default: 587 },
    secure: { type: Boolean, default: false },
    user: { type: String, required: true },
    pass: { type: String, required: true },
    from: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now }
})

export const SmtpSetting = mongoose.models.SmtpSetting || mongoose.model('SmtpSetting', SmtpSettingSchema)
