import { Router } from "express";
import { processEvent } from "../../../utils/helpers/akiraEventBrain.mjs";
import { generateID } from "../../../utils/helpers/generateID.mjs";
import pool from "../../../utils/validatorSchema/DBSchema.mjs";

const router = Router();

// --- DYNAMIC STORE AND QUOTA RETRIEVAL ---

/**
 * Retrieves store configuration and ID dynamically using the snippet token.
 */
const getStoreByToken = async (token) => {
  // ⚡ REAL IMPLEMENTATION: Query the "stores" table WHERE "snippetToken" = token.
  const storeQuery = `
        SELECT 
            "id" AS "storeId", 
            "platform", 
            "currentMonthlyUsage", 
            "queryAllocation", 
            "userId" 
        FROM "stores" 
        WHERE "snippetToken" = $1;
    `;

  try {
    const result = await pool.query(storeQuery, [token]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error("DB Error fetching store by token:", error);
    return null;
  }
};

/**
 * Checks if the store is allowed to submit the event based on quota limits.
 * (This mock logic remains simple for now, using the fetched store data)
 */
const checkStoreQuota = async (store) => {
  // ⚠️ CRITICAL: The full quota check logic would go here, fetching user limits
  // for Consolidated billing. For now, we use simple per-store limits.
  if (store.currentMonthlyUsage >= store.queryAllocation) {
    return {
      allowed: false,
      reason: "Store reached its query allocation limit (429).",
    };
  }
  return { allowed: true };
};
// --- END DYNAMIC RETRIEVAL ---

// --- CORE EVENT CAPTURE ROUTE ---
router.post("/events/capture", async (request, response) => {
  const snippetToken = request.headers["x-akira-token"];

  const {
    storeId: incomingStoreId, // ID sent by the snippet (used for validation only)
    eventType,
    userId: userIdentifier,
    productId,
    payload,
  } = request.body;

  // 1. BASIC VALIDATION & AUTHENTICATION (Token is required first)
  if (!snippetToken || !eventType || !userIdentifier) {
    return response
      .status(400)
      .send({
        message: "Missing required parameters or authentication token.",
      });
  }

  // 2. AUTHENTICATION & STORE CONFIG RETRIEVAL (Dynamically fetch store data)
  const store = await getStoreByToken(snippetToken);

  // a) Check if token is valid (store exists)
  if (!store) {
    console.warn(`Authentication failed. Invalid snippet token.`);
    return response
      .status(401)
      .send({ message: "Authentication failed. Invalid token." });
  }

  // b) Cross-check: Ensure the store ID from the token matches the ID in the body
  // This protects against a user mistakenly pasting their token into another store's configuration.
  if (store.storeId !== incomingStoreId) {
    console.warn(
      `Security Mismatch: Token ID (${store.storeId}) does not match body ID (${incomingStoreId}).`
    );
    return response
      .status(401)
      .send({ message: "Security failure: Store ID mismatch." });
  }

  // 3. QUOTA CHECK
  const quotaCheck = await checkStoreQuota(store);
  if (!quotaCheck.allowed) {
    console.warn(`Quota exceeded for store ${store.storeId}. Event denied.`);
    return response.status(429).send({ message: quotaCheck.reason });
  }

  try {
    const eventId = `evt_${generateID(10)}`;

    // 4. DATABASE INSERTION (The record of the event)
    const insertQuery = `
            INSERT INTO "events" (
                "event_id", "store_id", "event_type", "user_identifier", 
                "product_id", "event_payload"
            ) VALUES ($1, $2, $3, $4, $5, $6);
        `;

    const values = [
      eventId,
      store.storeId, // ⚡ USE THE AUTHENTICATED/DB-SYNCHED ID ⚡
      eventType,
      userIdentifier,
      productId || null,
      payload || {},
    ];

    await pool.query(insertQuery, values);

    // 5. CALL AKIRA BRAIN (Real-time intelligence)
    const newEvent = {
      event_id: eventId,
      store_id: store.storeId,
      event_type: eventType,
      user_identifier: userIdentifier,
      product_id: productId,
      event_payload: payload,
    };

    // Pass the event record to the Brain for processing
    processEvent(newEvent).catch((err) => {
      console.error(
        `[AKIRA BRAIN ERROR] Failed to process event ${newEvent.event_id}:`,
        err
      );
    });

    // 6. Success Response (202 Accepted)
    return response.status(202).send({
      message: "Event accepted and processing triggered.",
      eventId: eventId,
    });
  } catch (error) {
    console.error("Error recording store event:", error);
    return response
      .status(500)
      .send({ message: "Server error during event recording." });
  }
});

export default router;
