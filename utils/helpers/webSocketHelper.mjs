// --- utils/helpers/websocketHelper.mjs (Conceptual) ---

// In a real application, 'io' would be the Socket.IO server instance
// passed into this module during initialization.
let socketIOServer = null;

/**
 * Initializes the WebSocket server instance for use by the Akura Brain.
 * @param {object} ioInstance - The configured Socket.IO server instance.
 */
export const initializeWebSocket = (ioInstance) => {
  socketIOServer = ioInstance;
  console.log("WebSocket Helper: Initialized with Socket.IO server instance.");
};

/**
 * Pushes a real-time action from the Akura Brain to the correct client
 * (the store's frontend snippet).
 * * @param {string} storeId - The ID of the store where the action should occur.
 * @param {string} userIdentifier - The unique ID of the customer to target.
 * @param {object} akuraAction - The determined action (type and data).
 */
// export const pushActionToStore = async (
//   storeId,
//   userIdentifier,
//   akuraAction
// ) => {
//   if (!socketIOServer) {
//     console.error(
//       "WebSocket Helper: Socket.IO server not initialized. Cannot push action."
//     );
//     // This is the placeholder for production—it logs the intended action.
//     console.log(
//       `[ACTION LOG] Store: ${storeId}, User: ${userIdentifier}, Action: ${akuraAction.type}`,
//       akuraAction.data
//     );
//     return;
//   }

//   // --- REAL SOCKET.IO LOGIC CONCEPT ---
//   // 1. Target a specific "room" (representing the store) and "user"
//   //    (to ensure the action is only seen by the intended customer).
//   const roomKey = `store_${storeId}`;
//   const userKey = `user_${userIdentifier}`;

//   // 2. Broadcast the action to the specific user's connection within the store's "room."
//   //    (You would typically use a user-specific Socket.IO private channel or ID here.)
//   // For this conceptual example, we'll use a general broadcast channel:
//   socketIOServer.to(roomKey).emit("akuraAction", {
//     targetUser: userKey,
//     action: akuraAction,
//   });

//   console.log(
//     `WebSocket Push: Pushed ${akuraAction.type} to Store ${storeId} (User ${userIdentifier})`
//   );
// };


export const pushActionToStore = async (
  storeId,
  userIdentifier,
  akiraAction
) => {
  if (!socketIOServer) {
    console.error("WS Helper: Server not initialized. Action skipped.");
    return;
  }

  // 1. Target the specific Store Room (e.g., 'store_4166869391')
  const roomKey = `store_${storeId}`;

  // 2. The event data package sent over the socket
  const dataToSend = {
    targetUser: `user_${userIdentifier}`, // Used by the snippet to ensure correct client receives the message
    action: akiraAction,
  };

  // 3. Emit the action to the entire store room. The client-side snippet filters by targetUser.
  socketIOServer.to(roomKey).emit("akuraAction", dataToSend);

  console.log(
    `WS Push: Pushed ${akiraAction.type} to Store ${storeId} (User ${userIdentifier})`
  );
};