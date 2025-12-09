import {Router} from "express"
import { processEvent } from "../../../utils/helpers/akiraEventBrain.mjs";
import { generateID } from "../../../utils/helpers/generateID.mjs";
import pool from "../../../utils/validatorSchema/DBSchema.mjs";

const router = Router();

// --- /events/capture POST ROUTE ---
router.post("/events/capture", async (request, response) => {
  // Note: We don't use validateSession here, as this call comes from the public store's frontend snippet.
  // Authentication must use a Store/Snippet Secret Key in the headers or body (not shown here for brevity).

  const {
    storeId,
    eventType,
    userId: userIdentifier, // Renamed to match DB schema
    productId,
    payload,
  } = request.body;

  // 1. Basic Validation
  if (!storeId || !eventType || !userIdentifier) {
    return response
      .status(400)
      .send({
        message:
          "Missing required event parameters (storeId, eventType, userId).",
      });
  }

  try {
    const eventId = `evt_${generateID(10)}`; // Reusing your generateID helper

    // 2. DATABASE INSERTION (The goal is speed here)
    const query = `
            INSERT INTO "events" (
                "event_id", "store_id", "event_type", "user_identifier", 
                "product_id", "event_payload"
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING event_id, timestamp, store_id, user_identifier, event_type, product_id, event_payload;
        `;

    const values = [
      eventId,
      storeId,
      eventType,
      userIdentifier,
      productId || null,
      payload || {},
    ];

    const result = await pool.query(query, values);
    const newEvent = result.rows[0];

    // 3. ASYNCHRONOUS TRIGGER (Non-blocking call to Akura Brain)
    // We use an immediate function call but do NOT await it.
    processEvent(newEvent);

    // 4. Success Response (202 Accepted)
    return response.status(202).send({
      message: "Event accepted and processing triggered.",
      eventId: newEvent.event_id,
    });
  } catch (error) {
    // You should add more specific error handling (e.g., if storeId doesn't exist)
    console.error("Error recording store event:", error);
    return response
      .status(500)
      .send({ message: "Server error during event recording." });
  }
});


export default router;