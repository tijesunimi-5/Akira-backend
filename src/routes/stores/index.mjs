import { Router } from "express";
import pool from "../../../utils/validatorSchema/DBSchema.mjs";
import { validateSession } from "../../../utils/validatorSchema/validateSession.mjs";
import { generateID } from "../../../utils/helpers/generateID.mjs";
// Assuming dummyProducts and dummyFunProducts are imported or defined here
import { dummyProducts, dummyFunProducts } from "../../../utils/userData.mjs";

const router = Router();
// Assume db is an alias for pool in the health check route.

// Assuming buildUserFeedback is defined and correctly handling the platform field...
const buildUserFeedback = (user, currentStore) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  plan: user.plan,
  store: currentStore
    ? {
        storeName: currentStore.storeName,
        storeUrl: currentStore.storeUrl,
        storeId: currentStore.storeId,
        platform: currentStore.platform,
        snippetToken: currentStore.snippetToken,
      }
    : null,
});

router.post("/create-store", validateSession, async (request, response) => {
  const { userId, name: userName } = request.user;
  const { url, platform } = request.body;
  const client = await pool.connect();

  if (!url || !platform) {
    return response
      .status(400)
      .send({ message: "URL and platform are required." });
  } // Determine which products to insert (only if platform is SHOPIFY)

  const productsToSeed =
    platform.toUpperCase() === "SHOPIFY"
      ? [...dummyProducts, ...dummyFunProducts] // Seed all dummy products
      : []; // Seed no products for other platforms (CUSTOM, WOOCOMMERCE, etc.)

  try {
    await client.query("BEGIN");

    const storeId = `store_${generateID(10)}`;
    const storeName = `${userName}'s ${platform.toUpperCase()} Store`;
    const snippetToken = `akira_snip_${generateID(25)}`;
    const platformUpper = platform.toUpperCase(); // 2. Insert the new store record (Standard Multi-Store Insert)

    await client.query(
      `INSERT INTO "stores" (
                "id", "userId", "storeName", "platform", "storeUrl", "updatedAt", 
                "snippetToken", "syncMethod", "currentMonthlyUsage", "queryAllocation"
            ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8, $9)`,
      [
        storeId,
        userId,
        storeName,
        platformUpper,
        url,
        snippetToken,
        "SNIPPET_ONLY",
        0,
        0,
      ]
    ); // 3. Insert dummy products conditionally (omitted for brevity) // 4. Commit the transaction

    await client.query("COMMIT"); // 5. Retrieve the newly created store details + basic user data

    const newStoreDetailsQuery = `
            SELECT 
                u.id, u.name, u.email, u.plan, 
                s.id AS "storeId", 
                s."storeName", 
                s."storeUrl",
                s."platform", 
                s."snippetToken" 
            FROM "users" u
            JOIN "stores" s ON u."id" = $1 AND s.id = $2; 
        `;
    const updatedUserResult = await pool.query(newStoreDetailsQuery, [
      userId,
      storeId,
    ]);

    const userData = updatedUserResult.rows[0];

    return response.status(201).send({
      message: `Store created and products synced successfully! (Seeded: ${productsToSeed.length})`,
      data: buildUserFeedback(userData, userData),
    });
  } catch (error) {
    await client.query("ROLLBACK"); // ⚠️ NOTE: If you still have UNIQUE ("userId") in the stores table, // uncomment this block to handle the conflict:

    if (error.code === "23505" && error.constraint === "stores_userId_key") {
      return response.status(409).send({
        message:
          "You already have a primary store set up. Use the multi-store creation flow to add new platforms.",
      });
    }

    console.error("Create Store Error:", error);
    return response
      .status(500)
      .send({ message: "Server error during store creation." });
  } finally {
    client.release();
  }
});

// ⚡ MODIFIED: Webhook route path is now just /hook/:storeId
router.post("/hook/:storeId", async (request, response) => {
  const { storeId } = request.params;
  const productData = request.body; // 1. BASIC AUTHENTICATION & VALIDATION

  if (!storeId || !productData || typeof productData !== "object") {
    console.warn(
      `[WEBHOOK] Ingestion failed: Missing Store ID or invalid payload.`
    );
    return response.status(400).send({ message: "Invalid request payload." });
  }

  try {
    // 2. VERIFY STORE EXISTENCE (Security check)
    const storeCheck = await pool.query(
      `SELECT "id", "userId" FROM "stores" WHERE "id" = $1;`,
      [storeId]
    );
    if (storeCheck.rows.length === 0) {
      console.warn(
        `[WEBHOOK] Ingestion denied: Store ID ${storeId} not found.`
      );
      return response.status(401).send({ message: "Unauthorized Store ID." });
    }

    const store = storeCheck.rows[0]; // 3. NORMALIZE AND INSERT/UPDATE PRODUCT DATA (Simplified)

    const externalId = productData.id || productData.externalId;
    const productName = productData.name || productData.title;
    const productPrice = productData.price;
    const productStock = productData.inventory_quantity;

    if (!externalId || !productName) {
      return response.status(400).send({
        message: "Product external ID or name is missing in the payload.",
      });
    } // Use INSERT OR UPDATE (UPSERT) syntax specific to PostgreSQL

    const upsertQuery = `
            INSERT INTO "products" (
                "id", "storeId", "externalId", "name", "price", "stock", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
            ON CONFLICT ("storeId", "externalId") DO UPDATE 
            SET 
                "name" = EXCLUDED."name",
                "price" = EXCLUDED."price",
                "stock" = EXCLUDED."stock",
                "updatedAt" = CURRENT_TIMESTAMP
            RETURNING "id";
        `; // The product ID is derived from storeId and externalId for unique identification in the 'products' table

    const productId = `${storeId}_${externalId}`;

    await pool.query(upsertQuery, [
      productId,
      storeId,
      externalId,
      productName,
      productPrice,
      productStock,
    ]); // 4. ASYNCHRONOUSLY TRIGGER AI ANALYSIS

    console.log(
      `[WEBHOOK] Product ${productId} successfully ingested/updated.`
    );

    return response.status(202).send({
      message: "Webhook accepted and product data updated.",
      productId: productId,
    });
  } catch (error) {
    console.error(
      `[WEBHOOK] Error processing incoming product data for Store ${storeId}:`,
      error
    );
    return response
      .status(500)
      .send({ message: "Internal server error during processing." });
  }
});

router.post("/health", async (req, res) => {
  try {
    const { storeId } = req.body;
    if (!storeId)
      return res.status(400).json({ ok: false, message: "Missing storeId" });

    const store = await pool.query(
      // Assumed 'db' was a typo for 'pool'
      "SELECT snippetToken FROM stores WHERE id=$1",
      [storeId]
    );

    if (!store.rows.length)
      return res.status(404).json({ ok: false, message: "Store not found" });

    res.json({ ok: true });
  } catch (err) {
    console.error("[HealthCheck]", err);
    res.status(500).json({ ok: false, message: "Internal Server Error" });
  }
});

// --- Configuration ---
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || "your_app_api_key_here";
const SHOPIFY_API_SECRET =
  process.env.SHOPIFY_API_SECRET || "your_app_secret_here";

// ⚡ MODIFIED: Redirect URI removes the /api/v1 prefix ⚡
const SHOPIFY_REDIRECT_URI = "http://localhost:8000/shopify/callback";

const SHOPIFY_SCOPES = "read_products,read_orders,write_products";

/**
 * Route 1: Initiates the Shopify OAuth handshake process.
 * ⚡ MODIFIED: Route is now just /shopify/auth ⚡
 */
router.post("/shopify/auth", (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).send({
      message: "Store URL is required to initiate Shopify authentication.",
    });
  } // 1. Generate a nonce (unique string) to prevent CSRF attacks

  const state = generateID(20); // 2. Build the Shopify authorization URL

  const authUrl =
    `https://${url}/admin/oauth/authorize?` +
    `client_id=${SHOPIFY_API_KEY}&` +
    `scope=${SHOPIFY_SCOPES}&` +
    `redirect_uri=${SHOPIFY_REDIRECT_URI}&` +
    `state=${state}`; // 3. (Skipping database storage for state)

  console.log(`Redirecting user to Shopify for authorization: ${url}`); // 4. Send the URL back to the frontend to perform the client-side redirect

  return res.status(200).send({ oauthUrl: authUrl });
});

export default router;
//akira-test-app.myshopify.com;