import nodemailer from 'nodemailer';

// Add type for email response
type EmailResponse = nodemailer.SentMessageInfo & {
  previewUrl?: string;
};

// Create a test account for development
let transporter: nodemailer.Transporter;

export async function setupEmailTransporter() {
  // For development, use ethereal.email (fake SMTP service)
  if (process.env.NODE_ENV !== 'production') {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } else {
    // For production, use your actual SMTP service
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
}

export async function sendPasswordResetEmail(
  email: string, 
  resetToken: string, 
  isRestaurant: boolean = false
): Promise<EmailResponse> {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:4000'}/${isRestaurant ? 'restaurant/' : ''}reset-password?token=${resetToken}`;
  
  const info = await transporter.sendMail({
    from: '"Ehgezli Support" <support@ehgezli.com>',
    to: email,
    subject: `Reset Your ${isRestaurant ? 'Restaurant ' : ''}Password`,
    text: `To reset your ${isRestaurant ? 'restaurant ' : ''}password, click the following link: ${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
    html: `
      <h1>Reset Your ${isRestaurant ? 'Restaurant ' : ''}Password</h1>
      <p>To reset your ${isRestaurant ? 'restaurant ' : ''}password, click the following link:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  });

  if (process.env.NODE_ENV !== 'production') {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('Preview URL:', previewUrl);
    return {
      ...info,
      previewUrl
    };
  }

  return info;
}
