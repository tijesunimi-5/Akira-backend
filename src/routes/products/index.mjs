import { Router } from "express";
import { validateSession } from "../../../utils/validatorSchema/validateSession.mjs";
import pool from "../../../utils/validatorSchema/DBSchema.mjs";
import { analyzeProduct } from "../../../utils/helpers/productAnalyzer.mjs";

const router = Router();

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

router.post(
  "/products/enhance-description",
  validateSession,
  async (request, response) => {
    const { productId, description, productName } = request.body;

    if (!productId) {
      return response.status(400).send({ message: "Product ID is required." });
    }

    try {
      const enhancedDescription = `✨ Introducing the ${productName}! ✨\n\n${
        description || "This amazing product"
      } just got even better. Experience top-tier quality and unmatched design, crafted just for you. Perfect for any occasion and built to last. \n\nDon't miss out—elevate your collection today!`;

      const updateQuery = `
        UPDATE "products" 
        SET "description" = $1 
        WHERE "id" = $2 
        RETURNING *; 
      `;

      const updatedProductResult = await pool.query(updateQuery, [
        enhancedDescription,
        productId,
      ]);

      if (updatedProductResult.rows.length === 0) {
        return response
          .status(404)
          .send({ message: "Product not found to update." });
      }

      const updatedProduct = updatedProductResult.rows[0];

      const analysis = analyzeProduct(updatedProduct);

      const finalProduct = {
        ...updatedProduct,
        ...analysis,
      };

      return response.status(200).send(finalProduct);
    } catch (error) {
      console.error("AI Enhancement Error:", error);
      return response
        .status(500)
        .send({ message: "Error enhancing description." });
    }
  }
);

// In index.mjs, inside the "ALL POST ROUTES" section

router.post(
  "/products/update-description",
  validateSession,
  async (request, response) => {
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

      const updatedProductResult = await pool.query(updateQuery, [
        description,
        productId,
      ]);

      if (updatedProductResult.rows.length === 0) {
        return response
          .status(404)
          .send({ message: "Product not found to update." });
      }

      const updatedProduct = updatedProductResult.rows[0];

      // --- 2. Re-analyze the product for its new health score ---
      const analysis = analyzeProduct(updatedProduct);

      // --- 3. Send the full, re-analyzed product back ---
      const finalProduct = {
        ...updatedProduct,
        ...analysis,
      };

      return response.status(200).send(finalProduct);
    } catch (error) {
      console.error("Update Description Error:", error);
      return response
        .status(500)
        .send({ message: "Error saving description." });
    }
  }
);

// --- PRODUCT SYNC JOB (Conceptual function) ---
/**
 * Simulates triggering the backend service to run a product sync.
 * In production, this would queue a job (e.g., using Redis or Kafka).
 */
const triggerProductSyncJob = async (storeId, syncMethod, config) => {
  console.log(
    `[SYNC] Triggering initial product sync for Store ${storeId}. Method: ${syncMethod}`
  );

  // ⚠️ Placeholder: Actual scraping/API calls run here, not blocking the API response.
  // Example: if (syncMethod === 'SCRAPING') await ScraperService.run(storeId, config);

  // Return immediately to keep the API response fast.
  return true;
};

// --- CORE CONFIGURATION ROUTE ---
router.post("/config", validateSession, async (request, response) => {
  // ⚡ Assumes currentStoreId is either in the JWT or passed via the frontend context
  const { userId } = request.user;

  // The Frontend must send the ID of the currently active store
  const { storeId, syncMethod, apiKey, secretKey, apiUrl, scraperConfig } =
    request.body;

  if (!storeId || !syncMethod) {
    return response
      .status(400)
      .send({ message: "Store ID and syncMethod are required." });
  }

  let configPayload = {};
  let syncStatus = "PENDING";

  // 1. VALIDATE & BUILD PAYLOAD based on chosen method
  switch (syncMethod) {
    case "API_KEY":
      if (!apiKey || !secretKey || !apiUrl) {
        return response
          .status(400)
          .send({
            message: "API Key, Secret Key, and URL are required for API sync.",
          });
      }
      configPayload = { apiKey, secretKey, apiUrl };
      syncStatus = "READY"; // Ready to pull
      break;

    case "WEBHOOK":
      // No input fields needed other than confirmation
      configPayload = {};
      syncStatus = "WAITING_FOR_HOOK"; // Waiting for the user's site to send data
      break;

    case "SCRAPING":
      if (!scraperConfig || !scraperConfig.sampleUrl) {
        return response
          .status(400)
          .send({ message: "Scraper configuration is incomplete." });
      }
      configPayload = scraperConfig;
      syncStatus = "READY"; // Ready to scrape
      break;

    default:
      return response.status(400).send({ message: "Invalid sync method." });
  }

  const client = await pool.connect();

  try {
    // 2. UPDATE STORES TABLE
    const updateQuery = `
            UPDATE "stores"
            SET 
                "syncMethod" = $1,
                "apiKey" = $2,          -- Stored generically
                "secretKey" = $3,       -- Stored generically
                "scraperConfig" = $4,   -- JSONB object
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = $5 AND "userId" = $6 
            RETURNING "id", "syncMethod";
        `;

    const result = await client.query(updateQuery, [
      syncMethod,
      apiKey || null, // API key/secret are only populated for API_KEY method
      secretKey || null,
      syncMethod === "SCRAPING" ? configPayload : null, // Only save JSONB for scraping
      storeId,
      userId,
    ]);

    if (result.rows.length === 0) {
      return response
        .status(404)
        .send({ message: "Store not found or unauthorized." });
    }

    // 3. TRIGGER SYNCHRONIZATION (Non-blocking)
    if (syncStatus === "READY") {
      await triggerProductSyncJob(storeId, syncMethod, configPayload);
    }

    return response.status(200).send({
      message: `Store sync configured successfully. Status: ${syncStatus}.`,
      storeId: storeId,
      syncMethod: syncMethod,
    });
  } catch (error) {
    console.error("Store Config Update Error:", error);
    return response
      .status(500)
      .send({ message: "Server error during configuration update." });
  } finally {
    client.release();
  }
});

export default router;
