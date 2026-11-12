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
//     logger.error("Email send failed: " + error.message, { stack: error.stack });
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
//     logger.error("Email send failed: " + error.message, { stack: error.stack });
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
//     logger.error("Email send failed: " + error.message, { stack: error.stack });
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
//     logger.error("Email send failed: " + error.message, { stack: error.stack });
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
const logger = require("../config/logging.js");
const {
  getP2PReservationDetails,
  getHourlyCharterDetails,
  getAirportServiceDetails,
} = require("./emailSenderHelper");

// Sourced from .env (see EMAIL_* keys) instead of hardcoded, so rotating the
// password or fixing the SMTP hostname doesn't require a code change/redeploy.
const fromEmail = process.env.EMAIL_FROM || "bookingnotification@odatransportation.com";
const adminEmail = process.env.EMAIL_ADMIN_TO || "info@odatransportation.com";

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
  host: process.env.EMAIL_HOST || "mail.odatransportation.com",
  port: Number(process.env.EMAIL_PORT) || 465,
  secure: (process.env.EMAIL_SECURE ?? "true") === "true", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || "bookingnotification@odatransportation.com",
    pass: process.env.EMAIL_PASSWORD,
  },
};

/**
 * One-off SMTP auth/connectivity check, run at boot (see src/app.js) so a bad
 * credential or hostname shows up loudly in the startup logs instead of
 * silently in `logs/logs.log` the next time a real email tries to send.
 */
async function verifyEmailTransport() {
  const transporter = nodemailer.createTransport(smtpConfig);
  await transporter.verify();
}

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
    logger.info("Email sent: " + info.response);
  } catch (error) {
    logger.error("Email send failed: " + error.message, { stack: error.stack });
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
    logger.info("Email sent: " + info.response);
  } catch (error) {
    logger.error("Email send failed: " + error.message, { stack: error.stack });
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
    logger.info("Email sent: " + emailResponse.response);
  } catch (error) {
    logger.error("Email send failed: " + error.message, { stack: error.stack });
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
      logger.error("Error getting reservation details: " + error.message, { stack: error.stack });
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

    // Sent independently (Promise.allSettled, not two sequential awaits) so
    // a failure on one side can never silently cancel the other — e.g. a bad
    // admin address or a transient SMTP hiccup on the admin send must not
    // stop a customer from getting their own confirmation/update email, and
    // vice versa. This actually happened: an SMTP auth outage on 2026-09-12
    // threw on whichever send ran first and skipped the other one entirely,
    // since both used to live under one shared try/catch.
    const [adminResult, userResult] = await Promise.allSettled([
      transporter.sendMail(adminOptions),
      transporter.sendMail(userOptions),
    ]);

    if (adminResult.status === "fulfilled") {
      logger.info("Admin email sent: " + adminResult.value.response);
    } else {
      logger.error("Admin email send failed: " + adminResult.reason?.message, {
        stack: adminResult.reason?.stack,
      });
    }

    if (userResult.status === "fulfilled") {
      logger.info("User email sent: " + userResult.value.response);
    } else {
      logger.error("User email send failed: " + userResult.reason?.message, {
        stack: userResult.reason?.stack,
      });
    }
  } catch (error) {
    logger.error("Email send failed: " + error.message, { stack: error.stack });
  }
}

const PAYOUT_METHOD_LABELS = {
  zelle: "Zelle",
  venmo: "Venmo",
  cashapp: "Cash App",
  paypal: "PayPal",
  bank_transfer: "Bank Transfer (ACH)",
  check: "Mailed Check",
  other: "Other",
};

/** Masks all but the last few digits — e.g. "123456789" -> "•••••6789". */
function maskDigits(value, visibleDigits = 4) {
  const str = String(value || "");
  if (str.length <= visibleDigits) return str;
  return "•".repeat(str.length - visibleDigits) + str.slice(-visibleDigits);
}

/**
 * Turns the customer's chosen payout method/details into display rows.
 * `mask: true` (used only for the admin email, which travels over SMTP and
 * can sit in inboxes/forwarding chains indefinitely) shows bank account and
 * routing numbers as last-4-only — the full numbers are still visible to
 * admin in the authenticated Cash-Out Requests dashboard when they're ready
 * to actually send the money.
 */
function formatPayoutForDisplay(payoutMethod, payoutDetails, { mask = false } = {}) {
  if (!payoutMethod || !payoutDetails) return null;
  const label = PAYOUT_METHOD_LABELS[payoutMethod] || payoutMethod;
  const rows = [];
  switch (payoutMethod) {
    case "zelle":
      rows.push(["Zelle", payoutDetails.zelleEmailOrPhone]);
      break;
    case "venmo":
      rows.push(["Venmo", `@${payoutDetails.venmoUsername}`]);
      break;
    case "cashapp":
      rows.push(["Cash App", payoutDetails.cashtag]);
      break;
    case "paypal":
      rows.push(["PayPal", payoutDetails.paypalEmail]);
      break;
    case "bank_transfer":
      rows.push(["Account Holder", payoutDetails.accountHolderName]);
      rows.push(["Bank", payoutDetails.bankName]);
      rows.push([
        "Routing Number",
        mask ? maskDigits(payoutDetails.routingNumber) : payoutDetails.routingNumber,
      ]);
      rows.push([
        "Account Number",
        mask ? maskDigits(payoutDetails.accountNumber) : payoutDetails.accountNumber,
      ]);
      break;
    case "check":
      rows.push(["Mailing Address", payoutDetails.mailingAddress]);
      break;
    default:
      rows.push(["Instructions", payoutDetails.instructions]);
  }
  return { label, rows };
}

/**
 * Notify both the customer and admin when a wallet cash-out request is
 * logged — whether the customer submitted it themselves or an admin logged
 * it on their behalf (requestedByAdmin). Mirrors
 * sendBookingConfirmationAndAdminEmail's Promise.allSettled pattern so a
 * failure sending one side's email (bad address, transient SMTP hiccup)
 * never silently cancels the other.
 */
async function sendCashOutRequestEmails({ user, request, balanceRemaining, requestedByAdmin = false }) {
  try {
    if (!user?.email) {
      logger.warn("[sendCashOutRequestEmails] Skipped — no email on file for this user.");
      return;
    }

    const baseData = {
      fullName: user.fullName || "Customer",
      email: user.email,
      phoneNumber: user.phoneNumber || null,
      amountRequested: Number(request.amountRequested),
      balanceRemaining: Number(balanceRemaining),
      note: request.note || null,
      walletCashOutRequestId: request.walletCashOutRequestId,
      requestedAt: new Date(request.createdAt || Date.now()).toLocaleString("en-US", dateOptions),
      requestedByAdmin,
    };

    const customerData = {
      ...baseData,
      payout: formatPayoutForDisplay(request.payoutMethod, request.payoutDetails, { mask: false }),
    };
    const adminData = {
      ...baseData,
      payout: formatPayoutForDisplay(request.payoutMethod, request.payoutDetails, { mask: true }),
    };

    const customerTemplatePath = path.join(
      __dirname, "..", "..", "emails", "templates", "cashOutRequestCustomer.ejs"
    );
    const adminTemplatePath = path.join(
      __dirname, "..", "..", "emails", "templates", "cashOutRequestAdmin.ejs"
    );

    const customerHtml = ejs.render(fs.readFileSync(customerTemplatePath, "utf8"), customerData);
    const adminHtml = ejs.render(fs.readFileSync(adminTemplatePath, "utf8"), adminData);

    const transporter = nodemailer.createTransport(smtpConfig);

    const customerOptions = {
      from: fromEmail,
      to: user.email,
      subject: "We've received your cash-out request — ODA Transportation",
      html: customerHtml,
    };
    const adminOptions = {
      from: fromEmail,
      to: adminEmail,
      subject: `New wallet cash-out request — $${baseData.amountRequested.toFixed(2)}`,
      html: adminHtml,
    };

    const [customerResult, adminResult] = await Promise.allSettled([
      transporter.sendMail(customerOptions),
      transporter.sendMail(adminOptions),
    ]);

    if (customerResult.status === "fulfilled") {
      logger.info("Cash-out customer email sent: " + customerResult.value.response);
    } else {
      logger.error(
        "Cash-out customer email send failed: " + customerResult.reason?.message,
        { stack: customerResult.reason?.stack }
      );
    }

    if (adminResult.status === "fulfilled") {
      logger.info("Cash-out admin email sent: " + adminResult.value.response);
    } else {
      logger.error(
        "Cash-out admin email send failed: " + adminResult.reason?.message,
        { stack: adminResult.reason?.stack }
      );
    }
  } catch (error) {
    // Never let an email-sending problem fail the cash-out request itself.
    logger.error("Cash-out email send failed: " + error.message, { stack: error.stack });
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
  verifyEmailTransport,
  sendCashOutRequestEmails,
};
