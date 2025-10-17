import nodemailer from "nodemailer";

//configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.AKIRA_EMAIL,
    pass: process.env.AKIRA_APP_PASSWORD,
  },
});

export const sendMail = (recipient, mailSubject, mailText, mailHtml) => {
  try {
    const mailOptions = {
      from: process.env.AKIRA_EMAIL,
      to: recipient,
      subject: mailSubject,
      text: mailText,
      html: mailHtml,
    };

    transporter.sendMail(mailOptions);
  } catch (error) {
    console.log(error);
    return { err: "Unauthorized request" };
  }
};
