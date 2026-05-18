// const nodemailer = require("nodemailer");
// const ejs = require("ejs");
// const fs = require("fs");
// const path = require("path");
// const {
//   getP2PReservationDetails,
//   getHourlyCharterDetails,
//   getAirportServiceDetails,
// } = require("./emailSenderHelper");

// const fromEmail = "bookingnotification@odatransportation.com";
// // const adminEmail = "abditirunehdev@gmail.com";
// const adminEmail = "info@odatransportation.com";

// const dateOptions = {
//   year: "numeric",
//   month: "long",
//   day: "numeric",
//   hour: "numeric",
//   minute: "numeric",
//   hour12: true,
// };

// // SMTP configuration
// const smtpConfig = {
//   host: "mail.odatransportation.com",
//   port: 465,
//   secure: true, // true for 465, false for other ports
//   auth: {
//     user: "bookingnotification@odatransportation.com",
//     pass: "yvVrFT@K[1I#",
//     // user: "info@odatransportation.com",
//     // pass: "H)PH!_YUS,LE",
//   },
// };

// async function sendBookingApprovalEmail(data, action, userEmail) {
//   const transporter = nodemailer.createTransport(smtpConfig);

//   let html;

//   if (action === "ACCEPTED") {
//     const templatePath = path.join(
//       __dirname,
//       "..",
//       "..",
//       "emails",
//       "templates",
//       "acceptedBooking.ejs"
//     );

//     const template = fs.readFileSync(templatePath, "utf8");
//     html = ejs.render(template, data);
//   } else {
//     const templatePath = path.join(
//       __dirname,
//       "..",
//       "..",
//       "emails",
//       "templates",
//       "rejectedBooking.ejs"
//     );

//     const template = fs.readFileSync(templatePath, "utf8");
//     html = ejs.render(template, data);
//   }

//   const options = {
//     from: fromEmail,
//     to: userEmail,
//     subject: "Oda Booking Notifications",
//     html: html,
//   };

//   try {
//     const info = await transporter.sendMail(options);
//     console.log("Email sent:", info.response);
//   } catch (error) {
//     console.error("Error occurred:", error);
//   }
// }

// async function sendResetPasswordEmail(email, fullName, resetToken) {
//   const resetLink = `https://odatransportation.com/reset-password/${resetToken}`;
//   const variables = {
//     fullName: fullName,
//     resetLink: resetLink,
//   };

//   const transporter = nodemailer.createTransport(smtpConfig);

//   const templatePath = path.join(
//     __dirname,
//     "..",
//     "..",
//     "emails",
//     "templates",
//     "passwordResetTemplate.ejs"
//   );

//   const template = fs.readFileSync(templatePath, "utf8");
//   let html = ejs.render(template, variables);

//   // Configure email options
//   const options = {
//     from: fromEmail,
//     to: email,
//     subject: "Password Reset Request",
//     html: html,
//   };

//   try {
//     const info = await transporter.sendMail(options);
//     console.log("Email sent:", info.response);
//   } catch (error) {
//     console.error("Error occurred:", error);
//   }
// }

// // Notify user when payment is made
// async function paymentNotification(userEmail, data) {
//   try {
//     // Load email templates
//     const templatePath = path.join(
//       __dirname,
//       "..",
//       "..",
//       "emails",
//       "templates",
//       "paymentAccepted.ejs"
//     );

//     const template = fs.readFileSync(templatePath, "utf8");

//     // Render email templates with data
//     const html = ejs.render(template, data);

//     // Configure transporter for sending emails
//     const transporter = nodemailer.createTransport(smtpConfig);

//     // Configure email options
//     const options = {
//       from: fromEmail,
//       to: userEmail,
//       subject: "Payment Accepted",
//       html: html,
//     };

//     // Send emails
//     const emailResponse = await transporter.sendMail(options);
//     console.log("Email sent:", emailResponse.response);
//   } catch (error) {
//     console.error("Error occurred:", error);
//   }
// }

// // Notify admin and user when new booking is placed
// async function bookingNotification(bookingType, booking) {
//   try {
//     const date = new Date();
//     // Convert to Pacific Time
//     const pacificDate = new Intl.DateTimeFormat('en-US', {
//       timeZone: 'America/Los_Angeles',
//       month: 'short',
//       day: 'numeric',
//       year: 'numeric',
//     }).format(date);

//     const pacificTime = new Intl.DateTimeFormat('en-US', {
//       timeZone: 'America/Los_Angeles',
//       hour: 'numeric',
//       minute: '2-digit',
//       hour12: true,
//     }).format(date);

//     const reservationDate = pacificDate;  // Will output format like "Mar 2, 2025"
//     const reservationTime = `${pacificTime}`; // Will output format like "6:08 PM (Pacific Time)"

//     let reservationDetails, fareDetails;
//     try {
//       if (bookingType === "Point to point") {
//         ({ reservationDetails, fareDetails } = getP2PReservationDetails(
//           bookingType,
//           booking
//         ));
//       } else if (bookingType === "Hourly Charter") {
//         ({ reservationDetails, fareDetails } = getHourlyCharterDetails(
//           bookingType,
//           booking
//         ));
//       } else if (bookingType === "Airport Service") {
//         ({ reservationDetails, fareDetails } = getAirportServiceDetails(
//           bookingType,
//           booking
//         ));
//       } else {
//         throw new Error(`Invalid booking type: ${bookingType}`);
//       }
//     } catch (error) {
//       console.error("Error getting reservation details:", error);
//       throw new Error(`Failed to get reservation details: ${error.message}`);
//     }

//     const userEmail = booking.passengerEmail;

//     const data = {
//       name: booking.passengerFullName,
//       reservationDate: reservationDate,
//       reservationTime: reservationTime,
//       userEmail: userEmail,

//       contactDetails: {
//         "Confirmation Number": booking.confirmationNumber,
//         "Passenger Name": booking.passengerFullName,
//         "Contact Phone": booking.passengerCellPhone,
//         "Contact Email": userEmail,
//       },
//       reservationDetails: reservationDetails,
//       fareDetails: fareDetails,
//       totalFare: `$${Number(booking.totalTripFeeInDollars).toFixed(2)}`,
//     };

//     const userTemplatePath = path.join(
//       __dirname,
//       "..",
//       "..",
//       "emails",
//       "templates",
//       "newUserBookingConfirmation.ejs"
//     );

//     const adminTemplatePath = path.join(
//       __dirname,
//       "..",
//       "..",
//       "emails",
//       "templates",
//       "newAdminBookingConfirmation.ejs"
//     );

//     const userTemplate = fs.readFileSync(userTemplatePath, "utf8");
//     const adminTemplate = fs.readFileSync(adminTemplatePath, "utf8");

//     const userHtml = ejs.render(userTemplate, data);
//     const adminHtml = ejs.render(adminTemplate, data);

//     const transporter = nodemailer.createTransport(smtpConfig);

//     // Configure email options for admin
//     const adminOptions = {
//       from: fromEmail,
//       to: adminEmail,
//       subject: "New Booking Notification",
//       html: adminHtml,
//     };

//     // Configure email options for user
//     const userOptions = {
//       from: fromEmail,
//       to: userEmail,
//       subject: "Booking Confirmation",
//       html: userHtml,
//     };

//     // Send emails
//     const adminInfo = await transporter.sendMail(adminOptions);
//     console.log("Admin Email sent:", adminInfo.response);

//     const userInfo = await transporter.sendMail(userOptions);
//     console.log("User Email sent:", userInfo.response);
//   } catch (error) {
//     console.error("Error occurred:", error);
//   }
// }
// module.exports = {
//   sendBookingApprovalEmail,
//   sendResetPasswordEmail,
//   bookingNotification,
//   paymentNotification,
// };




const nodemailer = require("nodemailer");
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");
const {
  getP2PReservationDetails,
  getHourlyCharterDetails,
  getAirportServiceDetails,
} = require("./emailSenderHelper");

const fromEmail = "bookingnotification@odatransportation.com";
// const adminEmail = "abditirunehdev@gmail.com";
const adminEmail = "info@odatransportation.com";

const dateOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hour12: true,
};

// SMTP configuration
const smtpConfig = {
  host: "mail.odatransportation.com",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: "bookingnotification@odatransportation.com",
    pass: "yvVrFT@K[1I#",
    // user: "info@odatransportation.com",
    // pass: "H)PH!_YUS,LE",
  },
};

async function sendBookingApprovalEmail(data, action, userEmail) {
  const transporter = nodemailer.createTransport(smtpConfig);

  let html;

  if (action === "ACCEPTED") {
    const templatePath = path.join(
      __dirname,
      "..",
      "..",
      "emails",
      "templates",
      "acceptedBooking.ejs"
    );

    const template = fs.readFileSync(templatePath, "utf8");
    html = ejs.render(template, data);
  } else {
    const templatePath = path.join(
      __dirname,
      "..",
      "..",
      "emails",
      "templates",
      "rejectedBooking.ejs"
    );

    const template = fs.readFileSync(templatePath, "utf8");
    html = ejs.render(template, data);
  }

  const options = {
    from: fromEmail,
    to: userEmail,
    subject: "Oda Booking Notifications",
    html: html,
  };

  try {
    const info = await transporter.sendMail(options);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

async function sendResetPasswordEmail(email, fullName, resetToken) {
  const resetLink = `https://odatransportation.com/reset-password/${resetToken}`;
  const variables = {
    fullName: fullName,
    resetLink: resetLink,
  };

  const transporter = nodemailer.createTransport(smtpConfig);

  const templatePath = path.join(
    __dirname,
    "..",
    "..",
    "emails",
    "templates",
    "passwordResetTemplate.ejs"
  );

  const template = fs.readFileSync(templatePath, "utf8");
  let html = ejs.render(template, variables);

  // Configure email options
  const options = {
    from: fromEmail,
    to: email,
    subject: "Password Reset Request",
    html: html,
  };

  try {
    const info = await transporter.sendMail(options);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

// Notify user when payment is made
async function paymentNotification(userEmail, data) {
  try {
    // Load email templates
    const templatePath = path.join(
      __dirname,
      "..",
      "..",
      "emails",
      "templates",
      "paymentAccepted.ejs"
    );

    const template = fs.readFileSync(templatePath, "utf8");

    // Render email templates with data
    const html = ejs.render(template, data);

    // Configure transporter for sending emails
    const transporter = nodemailer.createTransport(smtpConfig);

    // Configure email options
    const options = {
      from: fromEmail,
      to: userEmail,
      subject: "Payment Accepted",
      html: html,
    };

    // Send emails
    const emailResponse = await transporter.sendMail(options);
    console.log("Email sent:", emailResponse.response);
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

/**
 * Notify admin and user with the same reservation/fare tables as a new booking.
 * @param {boolean} options.isUpdate - true after PATCH update (different subject & intro copy).
 */
async function sendBookingConfirmationAndAdminEmail(bookingType, booking, options = {}) {
  const isUpdate = Boolean(options.isUpdate);
  try {
    const date = new Date();
    // Convert to Pacific Time
    const pacificDate = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);

    const pacificTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);

    const reservationDate = pacificDate;  // Will output format like "Mar 2, 2025"
    const reservationTime = `${pacificTime}`; // Will output format like "6:08 PM (Pacific Time)"

    let reservationDetails, fareDetails;
    try {
      if (bookingType === "Point to point") {
        ({ reservationDetails, fareDetails } = getP2PReservationDetails(
          bookingType,
          booking
        ));
      } else if (bookingType === "Hourly Charter") {
        ({ reservationDetails, fareDetails } = getHourlyCharterDetails(
          bookingType,
          booking
        ));
      } else if (bookingType === "Airport Service") {
        ({ reservationDetails, fareDetails } = getAirportServiceDetails(
          bookingType,
          booking
        ));
      } else {
        throw new Error(`Invalid booking type: ${bookingType}`);
      }
    } catch (error) {
      console.error("Error getting reservation details:", error);
      throw new Error(`Failed to get reservation details: ${error.message}`);
    }

    const userEmail = booking.passengerEmail;

    const data = {
      name: booking.passengerFullName,
      reservationDate: reservationDate,
      reservationTime: reservationTime,
      userEmail: userEmail,
      isUpdate,

      contactDetails: {
        "Confirmation Number": booking.confirmationNumber,
        "Passenger Name": booking.passengerFullName,
        "Contact Phone": booking.passengerCellPhone,
        "Contact Email": userEmail,
      },
      reservationDetails: reservationDetails,
      fareDetails: fareDetails,
      totalFare: `$${Number(booking.totalTripFeeInDollars).toFixed(2)}`,
    };

    const userTemplatePath = path.join(
      __dirname,
      "..",
      "..",
      "emails",
      "templates",
      "newUserBookingConfirmation.ejs"
    );

    const adminTemplatePath = path.join(
      __dirname,
      "..",
      "..",
      "emails",
      "templates",
      "newAdminBookingConfirmation.ejs"
    );

    const userTemplate = fs.readFileSync(userTemplatePath, "utf8");
    const adminTemplate = fs.readFileSync(adminTemplatePath, "utf8");

    const userHtml = ejs.render(userTemplate, data);
    const adminHtml = ejs.render(adminTemplate, data);

    const transporter = nodemailer.createTransport(smtpConfig);

    const adminSubject = isUpdate
      ? "Booking updated — admin notification"
      : "New Booking Notification";
    const userSubject = isUpdate
      ? "Your booking was updated — ODA Transportation"
      : "Booking Confirmation";

    const adminOptions = {
      from: fromEmail,
      to: adminEmail,
      subject: adminSubject,
      html: adminHtml,
    };

    const userOptions = {
      from: fromEmail,
      to: userEmail,
      subject: userSubject,
      html: userHtml,
    };

    const adminInfo = await transporter.sendMail(adminOptions);
    console.log("Admin Email sent:", adminInfo.response);

    const userInfo = await transporter.sendMail(userOptions);
    console.log("User Email sent:", userInfo.response);
  } catch (error) {
    console.error("Error occurred:", error);
  }
}

/** Notify admin and user when a new booking is placed */
async function bookingNotification(bookingType, booking) {
  return sendBookingConfirmationAndAdminEmail(bookingType, booking, { isUpdate: false });
}

/** Notify admin and user after a booking is updated (same detail tables as confirmation). */
async function bookingUpdateNotification(bookingType, booking) {
  return sendBookingConfirmationAndAdminEmail(bookingType, booking, { isUpdate: true });
}

module.exports = {
  sendBookingApprovalEmail,
  sendResetPasswordEmail,
  bookingNotification,
  bookingUpdateNotification,
  paymentNotification,
};
