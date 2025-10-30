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
  log('Warning: EMAIL_USER or EMAIL_PASS not set - email sending disabled or will use test account in dev');
}

let transporter: nodemailer.Transporter | null = null;

async function initTransporter() {
  if (transporter) return transporter;

  if (EMAIL_USER && EMAIL_PASS) {
    transporter = nodemailer.createTransport({
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
    });
  } else if (process.env.NODE_ENV !== 'production') {
    // Try ethereal for dev if no creds are provided
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
      console.log('[emailService] Using Ethereal test SMTP account for dev', testAccount.user);
    } catch (err) {
      console.warn('[emailService] Failed to create ethereal test account:', (err as any)?.message ?? err);
      transporter = null;
    }
  } else {
    transporter = null;
  }

  if (transporter && process.env.NODE_ENV !== 'production') {
    transporter.verify((err, success) => {
      if (err) {
        console.error('Email transporter verify failed:', err);
      } else {
        console.log('✅ Email transporter verified');
      }
    });
  }

  return transporter;
}

/** Simple wrapper to send mail */
export async function sendMail(opts: {
  to: string;
  from?: string;
  subject: string;
  html?: string;
  text?: string;
}) {
  const t = await initTransporter();
  if (!t) {
    const message = 'Email transporter not configured; skipping send';
    console.warn('[emailService] ' + message);
    // don't throw; return an object so caller may check if needed
    return { ok: false, message };
  }

  const mailOptions = {
    from: opts.from || `"AyurConnect" <${EMAIL_USER || 'no-reply@ayurconnect.com'}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text
  };

  try {
    const result = await t.sendMail(mailOptions);
    log('Mail sent result:', result);

    if (process.env.NODE_ENV !== 'production') {
      const preview = (nodemailer as any).getTestMessageUrl ? (nodemailer as any).getTestMessageUrl(result) : undefined;
      if (preview) console.log('[emailService] Preview URL:', preview);
    }

    return { ok: true, result };
  } catch (err: any) {
    console.warn('[emailService] sendMail failed:', err?.message ?? err);
    return { ok: false, error: err?.message ?? err };
  }
}

/** OTP email template (ported from your old project) */
export function getOtpEmailTemplate(otp: string, userName = 'User', expiryMinutes = 5) {
  // You said you have full HTML elsewhere — keep short variant here
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
