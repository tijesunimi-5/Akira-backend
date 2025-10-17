import { Router } from "express";
import User from "../../models/user.mjs";
import nodemailer from "nodemailer";
import dotenv from 'dotenv'

dotenv.config();
const router = Router()

console.log("Akira Email from .env:", process.env.AKIRA_EMAIL);
console.log("Akira App Password from .env:", process.env.AKIRA_APP_PASSWORD);

//configure nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.AKIRA_EMAIL,
    pass: process.env.AKIRA_APP_PASSWORD,
  },
});

//the message to be sent to every waitlists mail
const mailText = `
  Subject: Welcome to Akira's waitlist

  Thank you for joining the Akira waitlist. We are delighted to have you as one of the first to experience our innovative AI-powered e-commerce chatbot, designed to boost your sales by up to 20-30% and streamline customer interactions.

  Next Steps:
  We are actively preparing for our launch. You will receive a notification with exclusive early access details and a special launch offer. In the meantime, feel free to reach out to us at akiraaiofficial@gmail.com with any questions or to share additional feedback.

  We look forward to empowering your business with Akira's advanced features, including 24/7 sales support and predictive analytics. Thank you for your trust and patience as we finalize this solution.

  Best regards,


  Akira Team
  akiraaiofficial@gmail.com
`.trim();

//endpoint to send the mail
router.post("/api/waitlist", async (request, response) => {
  try {
    const newUser = new User(request.body);

    const savedUser = await newUser.save();

    // Send confirmation email
    console.log(newUser.email);
    const mailOptions = {
      from: process.env.AKIRA_EMAIL, // Use environment variable for consistency
      to: newUser.email,
      subject: "Thank you for joining Akira's waitlist",
      text: mailText,
    };

    // Use await with transporter.sendMail for proper error handling
    await transporter.sendMail(mailOptions);

    // Only send the success response after the email is sent
    response.status(201).json({
      message: "Successfully joined the waitlist. Check your email!",
      savedUser,
    });
  } catch (err) {
    if (err.code === 11000) {
      // Handle duplicate email error
      return response
        .status(409)
        .json({ message: "This email is already on the waitlist." });
    }
    console.error("Error saving user or sending email:", err);
    response.status(400).json({
      message: "Error saving user or sending email",
      error: err.message,
    });
  }
});

//endpoint to get the number of waitlists
router.get("/api/waitlist/count", async (request, response) => {
  try {
    const count = await User.countDocuments();
    response.status(200).json({ count: count });
  } catch (err) {
    response
      .status(500)
      .json({ message: "Error getting count", error: err.message });
  }
}); 

export default router