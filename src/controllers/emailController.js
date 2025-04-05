const nodemailer = require('nodemailer');

// Create transporter using cPanel email settings
const transporter = nodemailer.createTransport({
    host: "mail.odatransportation.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: "bookingnotification@odatransportation.com",
        pass: "yvVrFT@K[1I#",
    },
});

const sendEmail = async (req, res) => {
    try {
        const {
            from_name,
            from_email,
            from_phone,
            service,
            message,
            subject,
            to_email
        } = req.body;

        // Create email HTML template
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #03930A;">New Contact Form Submission</h2>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
          <p><strong>From:</strong> ${from_name}</p>
          <p><strong>Email:</strong> ${from_email}</p>
          <p><strong>Phone:</strong> ${from_phone}</p>
          <p><strong>Service Requested:</strong> ${service}</p>
          <h3>Message:</h3>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
        <div style="margin-top: 20px; font-size: 12px; color: #666;">
          <p>This email was sent from the Oda Transportation contact form.</p>
        </div>
      </div>
    `;

        // Configure email options
        const mailOptions = {
            from: {
                name: 'Oda Transportation Contact Form',
                address: 'info@odatransportation.com'
            },
            to: to_email,
            replyTo: from_email,
            subject: subject,
            html: htmlContent,
            headers: {
                'X-Priority': '1',
                'X-MSMail-Priority': 'High',
                'Importance': 'high'
            }
        };

        // Send email
        await transporter.sendMail(mailOptions);

        // Send auto-reply to customer
        const autoReplyOptions = {
            from: {
                name: 'Oda Transportation',
                address: 'info@odatransportation.com'
            },
            to: from_email,
            subject: 'Thank you for contacting Oda Transportation',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #03930A;">Thank You for Contacting Us</h2>
          <p>Dear ${from_name},</p>
          <p>Thank you for reaching out to Oda Transportation. We have received your message regarding ${service.toLowerCase()} services.</p>
          <p>Our team will review your request and get back to you within 24 hours.</p>
          <p>For urgent matters, please call us at (714) 313-4269.</p>
          <div style="margin-top: 20px;">
            <p><strong>Best regards,</strong></p>
            <p>Oda Transportation Team</p>
          </div>
        </div>
      `
        };

        await transporter.sendMail(autoReplyOptions);

        res.status(200).json({
            success: true,
            message: 'Email sent successfully'
        });

    } catch (error) {
        console.error('Email sending error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send email',
            error: error.message
        });
    }
};

module.exports = {
    sendEmail
}; 