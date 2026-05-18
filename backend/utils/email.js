import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Simple transporter using Ethereal for testing, or standard SMTP if configured
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER || 'test@ethereal.email',
    pass: process.env.SMTP_PASS || 'password',
  },
});

export const sendPasswordResetEmail = async (email, token) => {
  const resetLink = `http://localhost:5173/reset-password?token=${token}`;
  
  await transporter.sendMail({
    from: '"SplitEasy" <noreply@spliteasy.com>',
    to: email,
    subject: 'Password Reset Request',
    html: `
      <h2>Reset your password</h2>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetLink}">Reset Password</a>
    `,
  });
};
