// packages/api/src/services/emailService.ts
import nodemailer from 'nodemailer';
import debug from 'debug';

const log = debug('api:email');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_HOST = process.env.EMAIL_HOST; // optional
const EMAIL_PORT = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;
const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true'; // optional

if (!EMAIL_USER || !EMAIL_PASS) {
  log('Warning: EMAIL_USER or EMAIL_PASS not set - email sending disabled');
}

const transporter = (EMAIL_USER && EMAIL_PASS) ? nodemailer.createTransport({
  host: EMAIL_HOST || 'smtp.gmail.com',
  port: EMAIL_PORT ?? 465,
  secure: typeof EMAIL_SECURE === 'boolean' ? EMAIL_SECURE : true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
}) : null;

/**
 * Verify transporter in dev when transporter exists
 */
if (transporter && process.env.NODE_ENV !== 'production') {
  transporter.verify((err, success) => {
    if (err) {
      console.error('Email transporter verify failed:', err);
    } else {
      console.log('✅ Email transporter verified');
    }
  });
}

/** Simple wrapper to send mail */
export async function sendMail(opts: {
  to: string;
  from?: string;
  subject: string;
  html?: string;
  text?: string;
}) {
  if (!transporter) {
    const message = 'Email transporter not configured';
    console.warn(message);
    throw new Error(message);
  }

  const mailOptions = {
    from: opts.from || `"AyurConnect" <${EMAIL_USER}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text
  };

  const result = await transporter.sendMail(mailOptions);
  log('Mail sent result:', result);
  return result;
}

/** OTP email template (ported from your old project) */
export function getOtpEmailTemplate(otp: string, userName = 'User', expiryMinutes = 5) {
  const html = `<!doctype html> ...` // truncated for brevity below
  // Use the full HTML from your old project. (See note)
  // For brevity include a short HTML version here:
  const shortHtml = `
    <div style="font-family: Arial, sans-serif; line-height:1.4; color:#333">
      <h2>Hello ${userName}</h2>
      <p>Your verification code is:</p>
      <div style="font-size:32px; font-weight:bold; color:#4f46e5">${otp}</div>
      <p>Valid for ${expiryMinutes} minutes.</p>
    </div>
  `;
  const text = `Hello ${userName},\n\nYour verification code is ${otp}. Valid for ${expiryMinutes} minutes.`;
  return { html: shortHtml, text };
}

/** Appointment confirmation template (simple version) */
export function getAppointmentConfirmationEmail(details: {
  appointmentId: number | string;
  patientName: string;
  serviceType: string;
  appointmentDate: string;
  appointmentTime: string;
  amount: number | string;
  paymentId?: string;
}) {
  const html = `
    <div style="font-family: Arial, sans-serif; color:#111">
      <h2>Appointment Confirmed</h2>
      <p>Hi ${details.patientName},</p>
      <p>Your appointment <strong>#${details.appointmentId}</strong> for ${details.serviceType} is confirmed on ${details.appointmentDate} at ${details.appointmentTime}.</p>
      <p>Amount: ₹${details.amount}</p>
      <p>Payment ID: ${details.paymentId || 'N/A'}</p>
    </div>
  `;
  const text = `Appointment #${details.appointmentId} confirmed on ${details.appointmentDate} at ${details.appointmentTime}. Amount ₹${details.amount}.`;
  return { html, text };
}
