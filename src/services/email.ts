import nodemailer from 'nodemailer'
import { SmtpSetting } from '@/models/SmtpSetting'
interface SendOTPEmailParams {
  email: string
  otp: string
  name?: string
}

const getTransporter = async () => {
  const dbSettings = await SmtpSetting.findOne({ isActive: true })

  if (dbSettings) {
    return nodemailer.createTransport({
      host: dbSettings.host,
      port: dbSettings.port,
      secure: dbSettings.secure,
      auth: {
        user: dbSettings.user,
        pass: dbSettings.pass,
      },
    })
  }

  if (process.env.NODE_ENV === 'development' && !process.env.SMTP_HOST) {
    return null
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const getFromEmail = async () => {
  const dbSettings = await SmtpSetting.findOne({ isActive: true })
  if (dbSettings?.from) return dbSettings.from
  return process.env.SMTP_FROM || process.env.SMTP_USER
}

export async function sendOTPEmail({ email, otp, name }: SendOTPEmailParams): Promise<boolean> {
  try {
    const transporter = await getTransporter()
    const fromEmail = await getFromEmail()

    if (!transporter) {
      console.log('📧 [DEV MODE] OTP Email for', email, ':', otp)
      console.log('⚠️  Configure SMTP settings in .env for production')
      return true
    }

    const mailOptions = {
      from: `"CaptchaⱮaster" <${fromEmail}>`,
      to: email,
      subject: 'Your Login Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">🔐 CaptchaⱮaster</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
            <p style="font-size: 18px;">Hello ${name || 'User'},</p>
            <p style="font-size: 16px;">Your verification code is:</p>
            <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="font-size: 14px; color: #666;">This code will expire in 5 minutes. If you didn't request this, please ignore this email.</p>
          </div>
          <div style="background: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #999;">
            © ${new Date().getFullYear()} CaptchaⱮaster. All rights reserved.
          </div>
        </div>
      `,
      text: `Your CaptchaⱮaster verification code is: ${otp}. This code expires in 5 minutes.`,
    }

    await transporter.sendMail(mailOptions)
    return true
  } catch (error) {
    console.error('Failed to send OTP email:', error)
    return false
  }
}

export async function sendPasswordResetEmail({ email, resetToken, name }: { email: string; resetToken: string; name?: string }): Promise<boolean> {
  try {
    const transporter = await getTransporter()
    const fromEmail = await getFromEmail()

    if (!transporter) {
      console.log('📧 [DEV MODE] Password Reset for', email, ':', resetToken)
      return true
    }

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`

    const mailOptions = {
      from: `"CaptchaⱮaster" <${fromEmail}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto;">
          <div style="background: #1a1a2e; padding: 28px 40px; text-align: center; border-radius: 12px 12px 0 0;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
              <img src="https://captchamaster.org/logo.png" alt="CaptchaⱮaster" style="height: 36px; width: auto;" />
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">CaptchaⱮaster</h1>
            </div>
          </div>
          <div style="background: #ffffff; padding: 40px; border: 1px solid #e8ecf0; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #1a1a2e; margin: 0 0 6px 0; font-weight: 600;">Hello ${name || 'User'},</p>
            <p style="font-size: 15px; color: #555; line-height: 1.6; margin: 0 0 24px 0;">We received a request to reset your password. Click the button below to set a new one.</p>

            <div style="text-align: center; margin: 0 0 28px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: #1a1a2e; color: #ffffff; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px;">
                Reset Password
              </a>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px 0;">
              <tr>
                <td style="padding: 14px 16px; background: #f8f9fb; border-radius: 8px; font-size: 13px; color: #888; line-height: 1.5; text-align: center;">
                  ⏱ This link expires in <strong style="color: #555;">1 hour</strong>. If you didn't request this, you can safely ignore this email.
                </td>
              </tr>
            </table>

            <hr style="border: none; border-top: 1px solid #e8ecf0; margin: 0 0 16px 0;">
            <p style="font-size: 12px; color: #aaa; margin: 0; line-height: 1.5; text-align: center;">
              CaptchaⱮaster &bull; ${new Date().getFullYear()}
            </p>
          </div>
        </div>
      `,
      text: `Reset your password by visiting: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, please ignore this email.`,
    }

    await transporter.sendMail(mailOptions)
    return true
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    return false
  }
}

export async function sendWelcomeEmail({ email, name }: { email: string; name?: string }): Promise<boolean> {
  try {
    const transporter = await getTransporter()
    const fromEmail = await getFromEmail()

    if (!transporter) {
      console.log('📧 [DEV MODE] Welcome Email for', email)
      return true
    }

    const mailOptions = {
      from: `"CaptchaⱮaster" <${fromEmail}>`,
      to: email,
      subject: 'Welcome to CaptchaⱮaster!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">🚀 Welcome to CaptchaⱮaster!</h1>
          </div>
          <div style="background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
            <p style="font-size: 18px;">Hello ${name || 'User'},</p>
            <p style="font-size: 16px;">Thank you for joining CaptchaⱮaster! We're excited to have you on board.</p>
            <p style="font-size: 14px; color: #666;">Get started by exploring our platform and solving captchas with ease.</p>
          </div>
        </div>
      `,
      text: `Welcome to CaptchaⱮaster, ${name || 'User'}!`,
    }

    await transporter.sendMail(mailOptions)
    return true
  } catch (error) {
    console.error('Failed to send welcome email:', error)
    return false
  }
}

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
