import { Router } from "express";
import { signinValidatorSchema } from "../../../utils/validatorSchema/signinValidator.mjs";
import { signupValidatorSchema } from "../../../utils/validatorSchema/signupValidator.mjs";
import { dummyProducts } from "../../../utils/userData.mjs";
import { checkSchema } from "express-validator";
import { sendMail } from "../../../utils/helpers/mailer.mjs";
import { getConfirmationCode } from "../../../utils/helpers/confirmationCode.mjs";
import dotenv from "dotenv";
import { passwordValidator } from "../../../utils/helpers/validatePasswordHelper.mjs";
import { generateID } from "../../../utils/helpers/generateID.mjs";
import pool from "../../../utils/validatorSchema/DBSchema.mjs";
import {
  comparePassword,
  hashPassword,
} from "../../../utils/helpers/hashPasswordHelper.mjs";
import jwt from "jsonwebtoken";
import { validateSession } from "../../../utils/validatorSchema/validateSession.mjs";
import { analyzeProduct } from "../../../utils/helpers/productAnalyzer.mjs";

dotenv.config();
const router = Router();
const user = [];

const buildUserFeedback = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  plan: user.plan,
  store: user.storeName
    ? {
        storeName: user.storeName,
        storeUrl: user.storeUrl,
        storeId: user.storeId,
        snippetToken: user.snippetToken, // ⚡ Now correctly passed from the SELECT query ⚡
      }
    : null,
});

//--------------------- ALL ROUTES STARTS HERE ------------------------- //

// -------------------- ALL GET ROUTES STAYS HERE ------------------------ //
router.get("/users", validateSession, async (request, response) => {
  const fetch_query = `SELECT * FROM users`;

  try {
    const result = await pool.query(fetch_query);

    if (result.rows.length === 0) {
      return response.status(400).send({ message: "No user has registered!" });
    }
    return response
      .status(200)
      .send({ message: "Successfully fetched", data: result.rows[0] });
  } catch (error) {
    console.error("Error fetching users:", error);
    response.status(500).send({ message: "Server error.", error: error });
  }
  return response.status(200).send(akiraUserData);
});

router.get("/verify-session", validateSession, async (request, response) => {
  const userQueryText = `SELECT u.id, u.name, u.email, u.plan, s."storeName", s."storeUrl" FROM "users" u LEFT JOIN "stores" s ON u."id" = s."userId" WHERE u."id" = $1`;
  const result = await pool.query(userQueryText, [request.user.userId]);
  if (result.rows.length === 0) {
    return response.status(404).send({ message: "User not found." });
  }
  response.status(200).send({
    message: "Session is valid.",
    user: buildUserFeedback(result.rows[0]),
  });
});

//get users by filter
router.get("/users/:filter", validateSession, async (request, response) => {
  const { filter } = request.params;

  try {
    if (!filter) {
      return response.status(400).send({ message: "Identifier is required." });
    }

    if (/^d+$/.test(filter)) {
      const query = "SELECT * FROM users WHERE id = $!";
      const result = await pool.query(query, [filter]);

      if (result.rows.length === 0) {
        return response.status(404).send({ message: "User not found." });
      }

      return response.status.send({
        message: "Successfully fetched",
        data: buildUserFeedback(result.rows),
      });
    } else if (filter.includes("@")) {
      const query = "SELECT * FROM users WHERE email =$1";
      const result = await pool.query(query, [filter]);

      if (result.rows.length === 0) {
        return response.status(404).send({ message: "User not found" });
      }

      return response.status(200).send({
        message: "Successfully fetched",
        data: buildUserFeedback(result.rows),
      });
    } else {
      const query = "SELECT * FROM users WHERE name = $1";
      const result = await pool.query(query, [filter]);

      if (result.rows.length === 0) {
        return response.status(404).send({ message: "User not found." });
      }

      return response.status(200).send({
        message: "Successfully fetched.",
        data: buildUserFeedback(result.rows[0]),
      });
    }
  } catch (error) {
    console.error("An error occured:", error);
    return response
      .status(500)
      .send({ message: "An error occured", error: error });
  }
});

// -------------------- ALL POST ROUTES STAYS HERE ----------------------- //

router.post(
  "/user/signup",
  checkSchema(signupValidatorSchema),
  async (request, response) => {
    const { email, password, name, plan } = request.body;
    const emailExists = await pool.query(
      "SELECT email FROM users WHERE email = $1",
      [email]
    );

    if (emailExists.rows.length > 0) {
      return response.status(409).send({ message: "Email already exists" });
    }

    try {
      const hashedPassword = await hashPassword(password);

      const newUserQuery = await pool.query(
        "INSERT INTO users (name, email, password, plan) VALUES ($1, $2, $3, $4) RETURNING id, name, email, plan",
        [name, email, hashedPassword, plan || "free"]
      );
      const newUser = newUserQuery.rows[0];

      const token = jwt.sign(
        { userId: newUser.id, email: newUser.email, name: newUser.name },
        process.env.JWT_SECRET,
        { expiresIn: "4h" }
      );

      const code = getConfirmationCode(newUser.email);
      const subject = "Welcome! Confirm your account";
      const text = `Enter this code to confirm your account: ${code.otpCode}. This code expires in 2 minutes.`;
      const link = `https://akiraai.com/user?cc=${code.otpCode}`;
      const html = `<p>Click <a href="${link}">Here</a> to proceed to confirmation page </p>`;

      const mailSent = await sendMail(email, subject, text, html);

      if (!mailSent) {
        console.error("Failed to send confirmation email.");
      }

      return response.status(201).send({
        message:
          "Account created successfully. Check your Gmail to confirm account",
        data: buildUserFeedback(newUser),
        token: token,
      });
    } catch (error) {
      console.error("Signup Error:", error);
      return response
        .status(500)
        .send({ message: "Server error during signup" });
    }
  }
);

router.post("/create-store", validateSession, async (request, response) => {
  // request.user is populated by validateSession middleware
  const { userId, name: userName } = request.user;
  const { url, platform } = request.body;

  if (!url || !platform) {
    return response
      .status(400)
      .send({ message: "URL and platform are required." });
  }

  // ⚡ Start a database transaction for atomicity ⚡
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Generate unique IDs and a secure token
    const storeId = `store_${generateID(10)}`;
    const storeName = `${userName}'s Demo Store`;
    // Generate a unique token for the frontend snippet to use for authentication
    const snippetToken = `akira_snip_${generateID(25)}`;

    // 2. Insert the new store record with the generated token
    await client.query(
      `INSERT INTO "stores" ("id", "userId", "storeName", "platform", "storeUrl", "updatedAt", "snippetToken") 
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)`,
      [storeId, userId, storeName, platform.toUpperCase(), url, snippetToken]
    );

    // 3. Insert dummy products for the new store
    for (const product of dummyProducts) {
      await client.query(
        `INSERT INTO "products" ("id", "storeId", "externalId", "name", "description", "price", "stock", "imageUrls") 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          `prod_${generateID(10)}`,
          storeId,
          product.externalId,
          product.name,
          product.description,
          product.price,
          product.stock,
          product.imageUrls,
        ]
      );
    }

    // 4. Commit the transaction
    await client.query("COMMIT");

    // 5. Retrieve the fully updated user data including the new store/token details
    const updatedUserQuery = `
            SELECT 
                u.id, u.name, u.email, u.plan, 
                s.id AS "storeId", 
                s."storeName", 
                s."storeUrl",
                s."snippetToken" -- ⚡ CRITICAL: Retrieve the new token
            FROM "users" u
            LEFT JOIN "stores" s ON u."id" = s."userId"
            WHERE u."id" = $1;
        `;
    const updatedUserResult = await pool.query(updatedUserQuery, [userId]);

    // Ensure the token is passed in the feedback object
    const userDataWithStore = updatedUserResult.rows[0];

    // The user object sent back now includes storeId and snippetToken
    return response.status(201).send({
      message: "Store created and products synced successfully!",
      data: buildUserFeedback(userDataWithStore),
    });
  } catch (error) {
    // Rollback transaction on any error
    await client.query("ROLLBACK");
    console.error("Create Store Error:", error);
    return response
      .status(500)
      .send({ message: "Server error during store creation." });
  } finally {
    client.release();
  }
});



//route to confirm the registration code
router.post("/confirm", async (request, response) => {
  const { email, code } = request.body;
  const query_match_otp =
    "SELECT * FROM confirmation_tokens WHERE email_to_confirm = $1 AND otp = $2";

  try {
    if (!email || !code) {
      return response
        .status(400)
        .send({ message: "Email and otp can't be empty" });
    }

    const email_matched = await pool.query(query_match_otp, [email, code]);
    if (email_matched.rows.length === 0) {
      return response
        .status(404)
        .send({ message: "OTP has expired. Request new OTP" });
    }

    await pool.query("UPDATE users SET confirmed = TRUE WHERE email = $1", [
      email,
    ]);

    const userResult = await pool.query(
      "SELECT id, email, plan FROM users WHERE email = $1",
      [email]
    );
    const user = userResult.rows[0];

    const jsonToken = jwt.sign(
      {
        userID: user.id,
        email: user.email,
        plan: user.plan,
      },
      process.env.JWT_SECRET,
      { expiresIn: "4h" }
    );
    return response
      .status(200)
      .send({ message: "Account confirmation successful", token: jsonToken });
  } catch (error) {
    console.error("An error occured:", error);
    return response
      .status(500)
      .send({ message: "An error occured", error: error });
  }
});

router.post("/resend-otp", async (request, response) => {
  const { email } = request.body;
  const fetch_query = "SELECT id FROM users WHERE email = $1";
  const existing_confirmation_query =
    "SELECT resend_count, expires_at FROM confirmation_tokens WHERE user_id = $1";
  const OTP_RESEND_LIMIT = 3;
  const OTP_COOLDOWN_MINUTES = 5;

  try {
    const user = await pool.query(fetch_query, [email]);
    if (user.rows.length === 0) {
      return response.status(404).send({ message: "User not found" });
    }
    const userid = user.rows[0].id;
    const existing_confirmed_user = await pool.query(
      existing_confirmation_query,
      [userid]
    );
    const existing_token = existing_confirmed_user.rows[0];

    let newResendCount = 1;

    if (existing_token) {
      if (existing_token.resend_count >= OTP_RESEND_LIMIT) {
        const cooldownTime = new Date(
          existing_token.expires_at.getTime() + OTP_COOLDOWN_MINUTES * 60 * 1000
        );

        if (new Date() < cooldownTime) {
          const waitMinutes = Math.ceil(
            (cooldownTime - new Date()) / (60 * 1000)
          );
          return response.status(429).send({
            message: `Too many resend attempts. Please wait ${waitMinutes} minutes.`,
          });
        } else {
          newResendCount = 1;
        }
      } else {
        newResendCount = existing_token.resend_count + 1;
      }
    }

    const newOTP = getConfirmationCode(email);
    if (existing_token) {
      await pool.query(
        "UPDATE confirmation_tokens SET otp = $1, resend_count = $2, created_at = $3, expires_at = $4 WHERE user_id = $5",
        [
          newOTP.otpCode,
          newResendCount,
          newOTP.createdAt,
          newOTP.expiresAt,
          userid,
        ]
      );
    } else {
      await pool.query(
        "INSERT INTO confirmation_tokens (user_id, otp, email_to_confirm, resend_count, created_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6)",
        [
          userid,
          newOTP.otpCode,
          newOTP.email,
          newResendCount,
          newOTP.createdAt,
          newOTP.expiresAt,
        ]
      );
    }

    await sendMail(
      email,
      "Your New OTP",
      `Your new OTP is: ${newOTP.otpCode}`,
      `Your new OTP is: <b>${newOTP.otpCode}</b>`
    );

    return response.status(200).send({ message: "New OTP sent" });
  } catch (error) {
    console.log("An error occured:", error);
    return response
      .status(500)
      .send({ message: "An error occured", error: error });
  }
});

//Route to login to account
router.post(
  "/user/login",
  checkSchema(signinValidatorSchema),
  async (request, response) => {
    const { email, password } = request.body;
    const userQuery = await pool.query(
      `SELECT u.*, s."storeUrl", s."storeName" FROM "users" u LEFT JOIN "stores" s ON u."id" = s."userId" WHERE u."email" = $1`,
      [email]
    );

    if (userQuery.rows.length === 0) {
      return response.status(404).send({ message: "User does not exist" });
    }
    const loggedUser = userQuery.rows[0];

    const passwordMatch = await comparePassword(password, loggedUser.password);
    if (!passwordMatch) {
      return response.status(401).send({ message: "Invalid credentials" });
    }

    const tokenPayload = {
      userId: loggedUser.id,
      email: loggedUser.email,
      name: loggedUser.name,

    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "4h",
    });

    return response.status(200).send({
      message: "Sign in successful",
      data: buildUserFeedback(tokenPayload),
      token: token,
    });
  }
);

router.patch("/edit", validateSession, async (request, response) => {
  const { email, name, id } = request.body;
  const fetch_user = "SELECT * FROM users WHERE id = $1";
  const user = (await pool.query(fetch_user, [id])).rows[0];

  try {
    if (!user) {
      return response.status(404).send({ message: "User not found" });
    }

    if (!id) {
      return response
        .status(400)
        .send({ message: "Name field cannot be left empty" });
    }

    const result = await pool.query(
      "UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email) WHERE id = $3 RETURNING *;",
      [name, email, id]
    );

    if (result.rows.length === 0) {
      return response.status(404).send({ message: "User not found" });
    }
    return response.send({
      message: "Updated successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("An error occured:", error);
    return response
      .status(500)
      .send({ message: "An error occured", error: error });
  }
});

// New Route: Initiates Password Reset (Sends code to email)
router.post("/user/forgot-password", async (request, response) => {
    const { email } = request.body;

    try {
        const userQuery = await pool.query("SELECT id, name FROM users WHERE email = $1", [email]);

        if (userQuery.rows.length === 0) {
            // For security, respond vaguely even if the email doesn't exist
            return response.status(200).send({ message: "If the account exists, a reset code has been sent." });
        }
        
        const user = userQuery.rows[0];
        
        // 1. Generate a confirmation code (used as the reset token)
        const codeData = getConfirmationCode(email); // Reusing OTP logic for reset token
        const resetCode = codeData.otpCode;
        const expiresAt = codeData.expiresAt;
        
        // 2. Store the code in the confirmation_tokens table or a dedicated reset_tokens table
        // Delete any old tokens for this user/email
        await pool.query("DELETE FROM confirmation_tokens WHERE email_to_confirm = $1", [email]);

        // Insert new reset token
        await pool.query(
            "INSERT INTO confirmation_tokens (user_id, otp, email_to_confirm, created_at, expires_at, type) VALUES ($1, $2, $3, NOW(), $4, $5)",
            [user.id, resetCode, email, expiresAt, 'password_reset'] // Assuming a 'type' column can differentiate reset vs signup
        );

        // 3. Send email with the reset code
        const subject = "Akira AI Password Reset Code";
        const text = `Your password reset code is: ${resetCode}. This code expires shortly. Use it on the reset page.`;
        const html = `<p>Your password reset code is: <b>${resetCode}</b>. This code expires shortly.</p>
                      <p>If you did not request a password reset, please ignore this email.</p>`;

        const mailSent = await sendMail(email, subject, text, html);

        if (!mailSent) {
            console.error("Failed to send reset email.");
        }

        // Return a successful message regardless of whether the user exists (for security)
        return response.status(200).send({
            message: "A password reset code has been sent to your email address.",
        });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        return response.status(500).send({ message: "Server error during password reset request." });
    }
});

// New Route: Finalizes Password Reset (Verifies code and updates password)
router.post("/user/reset-password", async (request, response) => {
    const { email, code, password: newPassword } = request.body; 

    // 1. Initial Validation
    if (!email || !code || !newPassword) {
        return response.status(400).send({ message: "Email, code, and new password are required." });
    }

    const validatedPassword = passwordValidator(newPassword);

    if (!validatedPassword.valid) {
        return response.status(400).send({
            message: "Password does not meet requirements.",
            requirements: validatedPassword.errors,
        });
    }

    try {
        // 2. Verify the Code and Expiration Time
        // Ensures the code matches the email and hasn't expired (expires_at > NOW())
        const fetch_code_query = `
            SELECT u.id, t.expires_at 
            FROM users u
            JOIN confirmation_tokens t ON u.id = t.user_id 
            WHERE u.email = $1 AND t.otp = $2 AND t.expires_at > NOW()
            ORDER BY t.created_at DESC LIMIT 1;
        `;
        const codeResult = await pool.query(fetch_code_query, [email, code]);

        if (codeResult.rows.length === 0) {
            return response.status(401).send({ message: "Invalid or expired reset code." });
        }
        
        const userId = codeResult.rows[0].id;

        // 3. Hash and Update the Password
        const hashedPassword = await hashPassword(newPassword);
        
        await pool.query("UPDATE users SET password = $1 WHERE id = $2", [
            hashedPassword,
            userId,
        ]);

        // 4. Invalidate the Token
        await pool.query("DELETE FROM confirmation_tokens WHERE user_id = $1 AND otp = $2", [
            userId,
            code,
        ]);

        return response.status(200).send({ message: "Password has been successfully reset. You can now log in." });
        
    } catch (error) {
        console.error("Password Reset Error:", error);
        return response.status(500).send({ message: "An error occurred during password reset." });
    }
});

router.patch("/upgrade-plan", validateSession, async (request, response) => {
  const { email, plan } = request.body;
  const fetch_query = "SELECT * FROM users where email = $1";
  const update_query =
    "UPDATE users SET plan = $1 WHERE email = $2 RETURNING *;";
  const user = (await pool.query(fetch_query, [email])).rows[0];

  try {
    if (!email || !plan) {
      return response
        .status(400)
        .send({ message: "Must provide values for email and plan" });
    }

    if (!user) {
      return response.status(404).send({ message: "User not found" });
    }

    const result = await pool.query(update_query, [plan, email]);
    if (result.rows.length === 0) {
      return response
        .status(404)
        .send({ message: "User not found, Can't upgrade" });
    }

    return response.status(200).send({
      message: "Account upgraded",
      data: buildUserFeedback(result.rows[0]),
    });
  } catch (error) {
    console.error("An error occured:", error);
    return response
      .status(500)
      .send({ message: "An error occured", error: error });
  }
});

router.get("/products", validateSession, async (request, response) => {
  const { userId } = request.user;

  try {
    // We use a JOIN to efficiently get products belonging to the current user's store
    const query = `
      SELECT p.* FROM "products" p
      JOIN "stores" s ON p."storeId" = s."id"
      WHERE s."userId" = $1;
    `;

    const result = await pool.query(query, [userId]);

    return response.status(200).send({
      message: "Products fetched successfully",
      data: result.rows,
    });
  } catch (error) {
    console.error("Fetch Products Error:", error);
    return response
      .status(500)
      .send({ message: "Server error while fetching products." });
  }
});

router.get("/products/analyze", validateSession, async (request, response) => {
  const { userId } = request.user;
  try {
    const productQuery = `SELECT p.* FROM "products" p JOIN "stores" s ON p."storeId" = s."id" WHERE s."userId" = $1`;
    const productsResult = await pool.query(productQuery, [userId]);
    const products = productsResult.rows;

    if (products.length === 0) {
      return response.status(200).send({
        message: "No products found to analyze.",
        data: {
          analysisSummary: {
            totalProducts: 0,
            strongCount: 0,
            weakCount: 0,
            healthScore: 0,
          },
          analyzedProducts: [],
        },
      });
    }

    let strongCount = 0;
    const analyzedProducts = products.map((product) => {
      const analysis = analyzeProduct(product);
      if (analysis.status === "Strong") {
        strongCount++;
      }
      return { ...product, ...analysis };
    });

    const analysisSummary = {
      totalProducts: products.length,
      strongCount: strongCount,
      weakCount: products.length - strongCount,
      healthScore: Math.round((strongCount / products.length) * 100),
    };

    return response.status(200).send({
      message: "Analysis complete",
      data: { analysisSummary, analyzedProducts },
    });
  } catch (error) {
    console.error("Analyze Products Error:", error);
    return response
      .status(500)
      .send({ message: "Server error during product analysis." });
  }
});


router.post("/products/enhance-description", validateSession, async (request, response) => {
    const { productId, description, productName } = request.body;

    if (!productId) {
      return response.status(400).send({ message: "Product ID is required." });
    }

    try {
      const enhancedDescription = `✨ Introducing the ${productName}! ✨\n\n${description || 'This amazing product'} just got even better. Experience top-tier quality and unmatched design, crafted just for you. Perfect for any occasion and built to last. \n\nDon't miss out—elevate your collection today!`;
      
      
      const updateQuery = `
        UPDATE "products" 
        SET "description" = $1 
        WHERE "id" = $2 
        RETURNING *; 
      `;
      
      const updatedProductResult = await pool.query(updateQuery, [enhancedDescription, productId]);
      
      if (updatedProductResult.rows.length === 0) {
        return response.status(404).send({ message: "Product not found to update." });
      }
      
      const updatedProduct = updatedProductResult.rows[0];

      const analysis = analyzeProduct(updatedProduct);

      const finalProduct = {
        ...updatedProduct,
        ...analysis 
      };

      return response.status(200).send(finalProduct);

    } catch (error) {
      console.error("AI Enhancement Error:", error);
      return response.status(500).send({ message: "Error enhancing description." });
    }
  }
);

// In index.mjs, inside the "ALL POST ROUTES" section

router.post("/products/update-description", validateSession, async (request, response) => {
    const { productId, description } = request.body; // No productName needed

    if (!productId) {
      return response.status(400).send({ message: "Product ID is required." });
    }

    try {
      // --- 1. Update the product in your database ---
      const updateQuery = `
        UPDATE "products" 
        SET "description" = $1 
        WHERE "id" = $2 
        RETURNING *; 
      `;
      
      const updatedProductResult = await pool.query(updateQuery, [description, productId]);
      
      if (updatedProductResult.rows.length === 0) {
        return response.status(404).send({ message: "Product not found to update." });
      }
      
      const updatedProduct = updatedProductResult.rows[0];

      // --- 2. Re-analyze the product for its new health score ---
      const analysis = analyzeProduct(updatedProduct);

      // --- 3. Send the full, re-analyzed product back ---
      const finalProduct = {
        ...updatedProduct, 
        ...analysis 
      };

      return response.status(200).send(finalProduct);

    } catch (error) {
      console.error("Update Description Error:", error);
      return response.status(500).send({ message: "Error saving description." });
    }
  }
);

export default router;
