import { Resend } from 'resend';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const PASSWORD_RESET_PATH = '/reset-password';

export function buildPasswordResetUrl(token) {
  const clientUrl = env.clientUrl.replace(/\/+$/, '');
  const url = new URL(`${clientUrl}${PASSWORD_RESET_PATH}`);
  url.searchParams.set('token', token);
  return url.toString();
}

export function buildPasswordResetEmail(resetLink) {
  return {
    subject: 'Dat lai mat khau Zyra',
    text: [
      'Ban vua yeu cau dat lai mat khau Zyra.',
      `Mo lien ket sau trong vong 1 gio de tao mat khau moi: ${resetLink}`,
      'Neu ban khong yeu cau, hay bo qua email nay.',
    ].join('\n\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <h2>Dat lai mat khau Zyra</h2>
        <p>Ban vua yeu cau dat lai mat khau. Lien ket nay se het han sau 1 gio.</p>
        <p>
          <a href="${resetLink}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 18px;border-radius:8px;text-decoration:none">
            Dat lai mat khau
          </a>
        </p>
        <p>Neu nut khong hoat dong, hay mo lien ket nay:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>Neu ban khong yeu cau, hay bo qua email nay.</p>
      </div>
    `,
  };
}

export async function sendPasswordResetEmail(email, token) {
  const resetLink = buildPasswordResetUrl(token);
  const message = buildPasswordResetEmail(resetLink);

  if (!env.resendApiKey) {
    if (env.nodeEnv !== 'production') {
      logger.info('password_reset_email_dev_fallback', {
        provider: 'development',
        resetLink,
      });
      return { delivered: false, provider: 'development' };
    }
    throw new Error('RESEND_API_KEY is required for password reset email delivery in production.');
  }

  const resend = new Resend(env.resendApiKey);
  const result = await resend.emails.send({
    from: env.emailFrom,
    to: email,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });

  return { delivered: true, provider: 'resend', id: result?.data?.id };
}
