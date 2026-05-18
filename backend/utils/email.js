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
    from: '"Zyra" <noreply@zyra.app>',
    to: email,
    subject: 'Đặt lại mật khẩu Zyra',
    html: `
      <h2>Đặt lại mật khẩu</h2>
      <p>Nhấn vào liên kết bên dưới để đặt lại mật khẩu. Liên kết sẽ hết hạn sau 1 giờ.</p>
      <a href="${resetLink}">Đặt lại mật khẩu</a>
    `,
  });
};
