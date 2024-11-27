const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

const generateResetCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendResetEmail = async (email, resetCode) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Reset Password Code - Argo Scan',
    text: `Kode reset password Anda adalah: ${resetCode}\n\nKode ini akan kadaluarsa dalam 15 menit.`,
    html: `
      <h2>Reset Password - Argo Scan</h2>
      <p>Kode reset password Anda adalah:</p>
      <h1 style="color: #2b2b2b; letter-spacing: 2px;">${resetCode}</h1>
      <p>Kode ini akan kadaluarsa dalam 15 menit.</p>
      <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
    `
  });
};

module.exports = {
  generateToken,
  generateResetCode,
  sendResetEmail
};