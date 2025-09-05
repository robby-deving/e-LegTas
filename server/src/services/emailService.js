const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

// Create SMTP transporter with updated Gmail settings
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use Gmail service instead of manual host/port
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify connection
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to send emails');
  }
});

const sendOTPEmail = async (to, otp) => {
  try {
    const mailOptions = {
      from: {
        name: 'e-LegTas',
        address: process.env.SMTP_USER
      },
      to: to,
      subject: 'Your Password Reset Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2BB673; margin: 0;">e-<span style="color: #038B53;">LegTas</span></h1>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 10px; text-align: center;">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Verification</h2>
            <p style="color: #666; font-size: 16px; margin-bottom: 30px;">
              You requested to reset your password. Use the verification code below to continue:
            </p>
            
            <div style="background-color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h1 style="color: #0A9359; font-size: 32px; letter-spacing: 5px; margin: 0; font-weight: bold;">
                ${otp}
              </h1>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              This code will expire in 10 minutes. If you didn't request this, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #999; font-size: 12px;">
              © 2025 e-LegTas. All rights reserved.
            </p>
          </div>
        </div>
      `,
      text: `Your e-LegTas password reset verification code is: ${otp}. This code will expire in 10 minutes.`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendOTPEmail };