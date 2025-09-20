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

// Create reusable logo header component
const createLogoHeader = () => `
    <div style="text-align: center; padding: 32px 0; background-color: #ffffff; margin-bottom: 20px; border-bottom: 2px solid #f0f0f0;">
        <img src="https://odatransportation.com/static/media/ODA_Primary%20Logo.6715e0b164c507dbe1f2.png" 
             alt="ODA Black Car Service Logo" 
             style="max-width: 200px; height: auto;" />
    </div>
`;
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

        // Create email HTML template with logo
        const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
        ${createLogoHeader()}
        <div style="padding: 0 20px 20px;">
          <h2 style="color: #03930A; text-align: center; margin-bottom: 30px;">New Contact Form Submission</h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <p style="margin: 10px 0;"><strong>From:</strong> ${from_name}</p>
            <p style="margin: 10px 0;"><strong>Email:</strong> ${from_email}</p>
            <p style="margin: 10px 0;"><strong>Phone:</strong> ${from_phone}</p>
            <p style="margin: 10px 0;"><strong>Service Requested:</strong> ${service}</p>
            <h3 style="color: #03930A; margin-top: 20px;">Message:</h3>
            <p style="white-space: pre-wrap; margin: 10px 0;">${message}</p>
          </div>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
            <p>This email was sent from the ODA Black Car Service contact form.</p>
          </div>
        </div>
      </div>
    `;

        // Configure email options
        const mailOptions = {
            from: {
                name: 'ODA Black Car Service Contact Form',
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

        // Create auto-reply template with logo
        const autoReplyHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);">
          ${createLogoHeader()}
          <div style="padding: 0 20px 20px;">
            <h2 style="color: #03930A; text-align: center; margin-bottom: 30px;">Thank You for Contacting ODA Black Car Service</h2>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
              <p style="margin: 10px 0;">Dear ${from_name},</p>
              <p style="margin: 10px 0;">Thank you for reaching out to ODA Black Car Service. We have received your message regarding ${service.toLowerCase()} services.</p>
              <p style="margin: 10px 0;">Our team will review your request and get back to you within a short period.</p>
              <p style="margin: 20px 0; padding: 15px; background-color: #e8f5e9; border-radius: 5px; text-align: center;">
                <strong>For urgent matters, please call us at (714) 313-4269</strong>
              </p>
            </div>
            <div style="margin-top: 30px; text-align: center;">
              <p style="margin: 5px 0;"><strong>Best regards,</strong></p>
              <p style="margin: 5px 0; color: #03930A;">ODA Black Car Service Team</p>
            </div>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
              <a href="https://odatransportation.com" style="color: #03930A; text-decoration: none;">
                www.odatransportation.com
              </a>
            </div>
          </div>
        </div>
      `;

        // Send auto-reply to customer
        const autoReplyOptions = {
            from: {
                name: 'ODA Black Car Service',
                address: 'info@odatransportation.com'
            },
            to: from_email,
            subject: 'Thank you for contacting ODA Black Car Service',
            html: autoReplyHtml
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