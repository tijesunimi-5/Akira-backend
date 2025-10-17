//This route is to contain the endpoint for the business owners wanting to register with akira
import { Router } from "express";
import { signinValidatorSchema } from "../../../utils/validatorSchema/signinValidator.mjs";
import { signupValidatorSchema } from "../../../utils/validatorSchema/signupValidator.mjs";
// import {
//   hashPassword,
//   comparePassword,
// } from "../../../utils/helpers/hashPasswordHelper.mjs";
import { emailValidator } from "../../../utils/helpers/emailValidatorHelper.mjs";
import { akiraUserData } from "../../../utils/userData.mjs";
import { checkSchema, matchedData, validationResult } from "express-validator";
import { sendMail } from "../../../utils/helpers/mailer.mjs";
import { getConfirmationCode } from "../../../utils/helpers/confirmationCode.mjs";
import dotenv from "dotenv";
import { passwordValidator } from "../../../utils/helpers/validatePasswordHelper.mjs";
import { generateID } from "../../../utils/helpers/generateID.mjs";

dotenv.config();
const router = Router();
const user = [];

//--------------------- ALL ROUTES STARTS HERE ------------------------- //

// -------------------- ALL GET ROUTES STAYS HERE ------------------------ //
router.get("/akira-users", (request, response) => {
  return response.status(200).send(akiraUserData);
});

//get users by filter
router.get("/akira-users/:filter", (request, response) => {
  const { filter } = request.params;
  let result = [...akiraUserData];

  if (!filter) {
    return response.status(400).send({ message: "Filter is required." });
  }

  //check which type of data type is the filter
  if (/^\d+$/.test(filter)) {
    result = result.filter((user) => user.id && user.id.toString() === filter);
  } else if (filter.includes("@")) {
    result = result.filter(
      (user) =>
        user.email &&
        typeof user.email === "string" &&
        user.email.toLowerCase() === filter.toLowerCase()
    );
  } else {
    result = result.filter(
      (user) =>
        user.name &&
        typeof user.name === "string" &&
        user.name.toLowerCase().includes(filter.toLowerCase())
    );
  }

  if (result.length > 0) {
    return response.send(result);
  } else {
    return response.status(404).send({ message: "No user found" });
  }
});

// -------------------- ALL POST ROUTES STAYS HERE ----------------------- //

//create akira account
router.post(
  "/akira-user/signup",
  checkSchema(signupValidatorSchema),
  async (request, response) => {
    const { email, password, name } = request.body;
    const result = validationResult(request);
    const validatedEmail = emailValidator(email);

    const subject = "Confirm Your Account";

    try {
      if (!result.isEmpty() || !validatedEmail) {
        return response
          .status(400)
          .send({ errors: result.array(), message: "Invalid Credentials" });
      }

      //this checks if the email already exists so we won't have two identical emails
      if (
        akiraUserData.find(
          (user) =>
            user.email && user.email.toLowerCase() === email.toLowerCase()
        )
      ) {
        return response
          .status(401)
          .send({ message: "This user already exists" });
      }

      //this validates the password making sure it's strong enough
      if (!passwordValidator(password).valid) {
        return response
          .status(400)
          .send({ error: passwordValidator(password).errors });
      }

      const newRequest = matchedData(request);
      const code = await getConfirmationCode(newRequest.email); //this allows us to get a confirmation code for each registered users

      //here we set the message that will be delivered to each registered user's mail
      const mailText = `
      Welcome to Akira. Your account has successfully been created. 

      For more security protection, please copy this code to confirm your account:

      ${code} \nThis code expires in 1 minute 30seconds. 
    `.trim();

      //here we set the link where they'd be redirected to from their mail
      const link = `https://akira-ai.vercel.app/akira-user?uid=${request.sessionID}?cc=${code}`;
      const html = `<p>Click <a href="${link}">Here</a> to proceed to confirmation page </p>`; // here's how we set the link to be displayed in the mail.

      // newRequest.password = await hashPassword(newRequest.password)
      const newUser = {
        id: generateID(9),
        ...newRequest,
        confirmed: false,
      };

      //adding the new user to the temporary database
      akiraUserData.push(newUser);

      request.session.user = newUser;
      request.session.confirmationCode = code;

      user.push({
        User_SessionID: request.sessionID,
        User_Data: request.session,
      });
      // console.log("User:", user);
      // console.log("Session information:", request.session);
      // console.log("SessionID information:", request.sessionID);
      // console.log("confirmation link", link);

      // sendMail(newUser.email, subject, mailText, html);

      return response.status(201).send({
        message: "Account has successfully been created. Check your mail.",
        akiraUserData,
        "the session user storage": user,
      });
    } catch (error) {
      console.error("Error:", error);
      return response.status(500).send(error);
    }
  }
);

//route to confirm the registration code
router.post("/akira-user/confirmation", async (request, response) => {
  const { usid, cc } = request.body;

  try {
    if (!usid || !cc) {
      return response.status(400).send({
        message:
          "Must provide the necessary information (user sessionID and confirmation Code)",
      });
    }

    if (user.find((u) => u.User_SessionID !== usid) || !user.length) {
      return response.status(400).send({
        message: "Session doesn't exist - Login to get a new SessionID",
      });
    }

    if (user.find((u) => u.User_Data.confirmationCode !== cc)) {
      return response
        .status(400)
        .send({ message: "confirmation code doesn't match - get a new code" });
    }
    const matchedCC = user.find((u) => u.User_Data.confirmationCode === cc);

    if (matchedCC.User_Data.cookie._expires < Date.now()) {
      return response.status(400).send({ message: "Session expired already" });
    }

    if (
      user.find((u) => u.User_SessionID === usid) ||
      user.length > 0 ||
      user.find((u) => u.User_Data.confirmationCode === cc)
    ) {
      const matchedUser = user.find((u) => u.User_SessionID === usid);
      matchedUser.User_Data.user.confirmed = true;
      return response.status(200).send({
        message: "Confirmation code matches",
        "New matched User": matchedUser,
      });
    }
  } catch (error) {
    return response.status(400).send({ error: error });
  }
});

//Route to login to account
router.post(
  "/akira-user/signin",
  checkSchema(signinValidatorSchema),
  async (request, response) => {
    const result = validationResult(request);
    const validatedEmail = emailValidator(request.body.email);

    try {
      if (!result.isEmpty() || !validatedEmail) {
        return response
          .status(400)
          .send({ errors: result.array(), message: "Email is not valid" });
      }
      const loggedUser = matchedData(request);
      const matchedEmail = akiraUserData.find(
        (user) =>
          user.email &&
          user.email.toLowerCase() === loggedUser.email.toLowerCase()
      );

      if (!matchedEmail) {
        return response.status(404).send({
          message: "Email address doesn't exist - try creating an account.",
        });
      }
      if (matchedEmail.password !== loggedUser.password) {
        return response.status(400).send({
          message: "Password doesn't match - try resetting the password",
        });
      }

      matchedEmail.confirmed = true;
      request.session.user = matchedEmail;
      user.push({
        User_SessionID: request.sessionID,
        User_Data: request.session,
      });
      return response.status(200).send({
        // sessionID: request.sessionID,
        // session: request.session,
        message: "Login Successful",
        "user db": user,
      });
    } catch (error) {
      return response.status(400).send({ error: error });
    }
  }
);

//Route for forgot password
router.post("/akira-user/forgot-password", async (request, response) => {
  const { email, password } = request.body;
  const validatedEmail = emailValidator(email);
  const findUser = akiraUserData.find(
    (user) => user.email && user.email.toLowerCase() === email.toLowerCase()
  );
  try {
    if (!validatedEmail) {
      return response
        .status(400)
        .send({ message: "Email field cannot be left empty" });
    }

    if (!password || password.length < 5 || password.length > 24) {
      return response
        .status(400)
        .send({ message: "Password must be within 5 - 24 characters" });
    }

    if (!findUser) {
      return response.status(404).send({
        message: "Email doesn't exist - consider creating an account",
      });
    }

    findUser.password = password;
    findUser.confirmed = true;
    request.session.user = findUser;
    user.push({
      User_SessionID: request.sessionID,
      User_Data: request.session,
    });

    return response.status(200).send({
      message: "Password changed successfully!",
      full_Data: findUser,
      User_db: user,
    });
  } catch (error) {
    return response.status(400).send({ error: error });
  }
});

export default router;
