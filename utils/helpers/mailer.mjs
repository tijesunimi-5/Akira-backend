import nodemailer from "nodemailer";

//configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.AKIRA_EMAIL,
    pass: process.env.AKIRA_APP_PASSWORD,
  },
});

export const sendMail = async (recipient, subject, text, html) => {
  console.log(process.env.AKIRA_EMAIL, process.env.AKIRA_APP_PASSWORD);
  const mailOptions = {
    from: process.env.AKIRA_EMAIL,
    to: recipient,
    subject: subject,
    text: text,
    html: html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};
