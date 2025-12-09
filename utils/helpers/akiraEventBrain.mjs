import pool from "../validatorSchema/DBSchema.mjs";
import { pushActionToStore } from "../helpers/webSocketHelper.mjs";

/**
 * Handles the asynchronous analysis and "thinking" logic for a new event.
 * NOTE: This function should NOT block the HTTP response.
 * @param {object} eventData - The newly inserted event record from the database.
 */
export const processEvent = async (eventData) => {
  const { store_id, user_identifier, event_type, product_id } = eventData;

  // 1. --- CONTEXT RETRIEVAL (Get Recent Activity) ---
  // Look for recent high-value events for the current user in the same store.
  const contextQuery = `
        SELECT event_type, timestamp, event_payload
        FROM events
        WHERE store_id = $1 AND user_identifier = $2 
          AND is_filtered = FALSE
        ORDER BY timestamp DESC
        LIMIT 5; 
    `;
  const contextResult = await pool.query(contextQuery, [
    store_id,
    user_identifier,
  ]);
  const recentEvents = contextResult.rows;

  let akiraAction = null;

  // 2. --- AKIRA ALGORITHM (Decision Tree) ---

  if (event_type === "add_to_cart") {
    // Did the user immediately navigate away after adding? Or are they stuck on the same page?
    const viewsAfterCart = recentEvents.filter(
      (e) => e.event_type === "page_view"
    );

    // Simplified Check: If the cart was the last meaningful action (no new pages viewed)
    if (viewsAfterCart.length === 0) {
      akiraAction = {
        type: "TRIGGER_CHAT_PROMPT",
        data: {
          message: `Great choice! Is there anything else I can help you find before you check out?`,
        },
      };
    }
  } else if (event_type === "checkout_start") {
    // High-value signal: Customer is in the funnel. Check for previous abandonment.
    const previousCheckouts = recentEvents.filter(
      (e) => e.event_type === "checkout_start"
    ).length;
    const previousPurchases = recentEvents.filter(
      (e) => e.event_type === "purchase"
    ).length;

    if (previousCheckouts >= 2 && previousPurchases === 0) {
      // User has started checkout multiple times but never bought anything (Abandonment Risk!)
      akiraAction = {
        type: "DISPLAY_POPUP_OFFER",
        data: {
          discount: "5% OFF ENTIRE ORDER",
          code: "SAVE5",
          message: `Welcome back! Use code SAVE5 for 5% off this order—we saved your cart.`,
        },
      };
    } else if (previousPurchases === 0) {
      // First time in checkout, provide gentle assurance.
      akiraAction = {
        type: "DISPLAY_INFO_MESSAGE",
        data: { message: "We offer secure payment and fast, free returns." },
      };
    }
  }

  // 3. --- ACTION PUSH ---
  if (akiraAction) {
    console.log(
      `Akira Brain Action: Determined ${akiraAction.type} for user ${user_identifier}`
    );
    await pushActionToStore(store_id, user_identifier, akiraAction);
  }
};
