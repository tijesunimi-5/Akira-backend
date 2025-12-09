// --- services/memoryManagerService.mjs ---
import pool from "../validatorSchema/DBSchema.mjs";
import { generateID } from "../helpers/generateID.mjs";

// Constants for Filtering
const DAYS_TO_KEEP_RAW_EVENTS = 90; // Keep all raw events for 90 days
const CHAT_MIN_DURATION_SECONDS = 30; // Mark chats shorter than 30s as trash if no conversion follows

/**
 * Executes the nightly maintenance: summarizing old data and filtering low-value events.
 */
export const runNightlyMaintenance = async () => {
  console.log("Akira Memory Manager: Starting nightly maintenance...");

  // --- 1. SUMMARIZATION (Condensing knowledge) ---
  try {
    // Find raw events older than 90 days that haven't been summarized/filtered
    const oldEventsQuery = `
            SELECT store_id, user_identifier, event_type, COUNT(*), MIN(timestamp) as min_ts, MAX(timestamp) as max_ts
            FROM events
            WHERE timestamp < NOW() - INTERVAL '${DAYS_TO_KEEP_RAW_EVENTS} days' 
              AND is_filtered = FALSE
            GROUP BY store_id, user_identifier, event_type
            HAVING COUNT(*) > 10 -- Only summarize users with significant old activity
        `;
    const oldEventsResult = await pool.query(oldEventsQuery);

    for (const row of oldEventsResult.rows) {
      // Simplified summary logic:
      const period = `${row.min_ts.getFullYear()}-${String(
        row.min_ts.getMonth() + 1
      ).padStart(2, "0")}`;

      // **TODO: Execute complex summary logic and upsert into user_behavior_summary**

      // For now, we'll just log and assume the summary is handled:
      console.log(
        `Summarized ${row.count} '${row.event_type}' events for user ${row.user_identifier} in ${period}`
      );
    }
  } catch (error) {
    console.error("Memory Manager Error during Summarization:", error);
  }

  // --- 2. FILTERING (Setting is_filtered = TRUE) ---

  // A. Filter Raw Events Older than 90 Days
  try {
    const filterOldEventsQuery = `
            UPDATE events
            SET is_filtered = TRUE
            WHERE timestamp < NOW() - INTERVAL '${DAYS_TO_KEEP_RAW_EVENTS} days' 
              AND is_filtered = FALSE;
        `;
    const result = await pool.query(filterOldEventsQuery);
    console.log(`Memory Manager: Filtered ${result.rowCount} old raw events.`);
  } catch (error) {
    console.error("Memory Manager Error during Old Event Filtering:", error);
  }

  // B. Filter "Trash Chats"
  // This is complex: requires checking if a chat_initiated event was followed by
  // a chat_ended event within a short time AND no purchase event within 4 hours.
  try {
    // Conceptual query to find short, non-converting chats:
    const filterTrashChatsQuery = `
            UPDATE events AS e
            SET is_filtered = TRUE
            WHERE e.event_type = 'chat_initiated' 
              AND e.is_filtered = FALSE
              -- 1. Check if the chat was short (assume payload stores chat duration)
              AND (e.event_payload->>'duration_seconds')::int < ${CHAT_MIN_DURATION_SECONDS}
              -- 2. Check that no 'purchase' event followed within 4 hours for this user
              AND NOT EXISTS (
                  SELECT 1 FROM events AS p
                  WHERE p.user_identifier = e.user_identifier 
                    AND p.store_id = e.store_id
                    AND p.event_type = 'purchase'
                    AND p.timestamp BETWEEN e.timestamp AND e.timestamp + INTERVAL '4 hours'
              );
        `;
    // NOTE: This query is complex and may need optimization or refinement.
    const result = await pool.query(filterTrashChatsQuery);
    console.log(
      `Memory Manager: Filtered ${result.rowCount} low-value (trash) chat events.`
    );
  } catch (error) {
    console.error("Memory Manager Error during Chat Filtering:", error);
  }

  console.log("Akira Memory Manager: Nightly maintenance complete.");
};

// Example setup using node-cron (requires npm install node-cron)
// import cron from 'node-cron';
// cron.schedule('0 3 * * *', () => { // Runs every day at 3:00 AM
//     runNightlyMaintenance();
// });
