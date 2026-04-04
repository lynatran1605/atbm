const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

async function sendOtpEmail(email, otp, username, options = {}) {
  const mailer = getTransporter();
  const appName = process.env.APP_NAME || "Personal Diary";
  const subject = options.subject || `${appName} - Email OTP Verification`;
  const heading = options.heading || appName;
  const intro = options.intro || `Xin chao ${username || "ban"},`;
  const message = options.message || "Ma OTP cua ban la:";
  const footer = options.footer || "Ma co hieu luc trong 10 phut.";

  await mailer.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>${heading}</h2>
        <p>${intro}</p>
        <p>${message}</p>
        <h1 style="letter-spacing: 6px;">${otp}</h1>
        <p>${footer}</p>
      </div>
    `,
  });
}

module.exports = { sendOtpEmail };
