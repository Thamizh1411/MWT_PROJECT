const nodemailer = require('nodemailer');

const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass
    }
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.warn(`[Email Service] EMAIL_USER or EMAIL_APP_PASSWORD not set. Email not sent to ${to}. Subject: ${subject}`);
      return { success: false, reason: 'SMTP credentials not configured' };
    }

    const mailOptions = {
      from: `"WorkerBook" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text: text || html.replace(/<[^>]*>?/gm, ''),
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Email sent successfully to ${to} (MessageID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email Service Error]', error.message);
    return { success: false, error: error.message };
  }
};

const sendOTPEmail = async (email, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 8px;">
      <div style="background-color: #2563eb; padding: 15px; text-align: center; color: white; border-radius: 6px 6px 0 0;">
        <h2 style="margin: 0;">WorkerBook Email Verification</h2>
      </div>
      <div style="padding: 20px; background-color: #ffffff;">
        <p>Hello,</p>
        <p>Thank you for registering with <strong>WorkerBook</strong>. Please use the following 6-digit OTP to verify your email address:</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; background-color: #eff6ff; padding: 10px 20px; border-radius: 6px; border: 1px dashed #2563eb;">${otp}</span>
        </div>
        <p>This OTP is valid for <strong>5 minutes</strong>. If you did not request this verification, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #777;">WorkerBook Platform Security Team</p>
      </div>
    </div>
  `;
  return sendEmail({
    to: email,
    subject: 'Your WorkerBook Verification OTP',
    html
  });
};

const sendWelcomeEmail = async (email, name) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0;">
      <h2 style="color: #2563eb;">Welcome to WorkerBook, ${name}!</h2>
      <p>Your email address has been successfully verified.</p>
      <p>You can now log in and start using WorkerBook services.</p>
    </div>
  `;
  return sendEmail({
    to: email,
    subject: 'Welcome to WorkerBook!',
    html
  });
};

const sendWorkerApprovalEmail = async (email, name, approved) => {
  const subject = approved ? 'Worker Account Approved - WorkerBook' : 'Worker Verification Update - WorkerBook';
  const html = approved ? `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #16a34a;">Congratulations ${name}!</h2>
      <p>Your worker account has been verified and approved by the WorkerBook Admin Team.</p>
      <p>You are now active and available to receive service bookings from customers.</p>
    </div>
  ` : `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #dc2626;">Worker Verification Notice</h2>
      <p>Dear ${name}, your worker verification request was not approved at this time.</p>
      <p>Please contact support for further information.</p>
    </div>
  `;
  return sendEmail({ to: email, subject, html });
};

const sendBookingStatusEmail = async (email, recipientName, statusMessage, details) => {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0;">
      <h3 style="color: #2563eb;">WorkerBook Booking Notification</h3>
      <p>Hello ${recipientName},</p>
      <p><strong>${statusMessage}</strong></p>
      ${details ? `<p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px;">${details}</p>` : ''}
    </div>
  `;
  return sendEmail({ to: email, subject: 'WorkerBook Booking Update', html });
};

const sendLeaveStatusEmail = async (email, workerName, status, startDate, endDate) => {
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h3>Leave Request Update</h3>
      <p>Hello ${workerName},</p>
      <p>Your leave request from <strong>${new Date(startDate).toDateString()}</strong> to <strong>${new Date(endDate).toDateString()}</strong> has been <strong>${status}</strong>.</p>
    </div>
  `;
  return sendEmail({ to: email, subject: `Leave Request ${status} - WorkerBook`, html });
};

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendWorkerApprovalEmail,
  sendBookingStatusEmail,
  sendLeaveStatusEmail
};
