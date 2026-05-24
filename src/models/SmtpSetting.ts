import mongoose from 'mongoose'

const SmtpSettingSchema = new mongoose.Schema({
    host: { type: String, required: true },
    port: { type: Number, required: true, default: 587 },
    secure: { type: Boolean, default: false },
    user: { type: String, required: true },
    pass: { type: String, required: true },
    from: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    updatedAt: { type: Date, default: Date.now }
})

export const SmtpSetting = mongoose.models.SmtpSetting || mongoose.model('SmtpSetting', SmtpSettingSchema)
