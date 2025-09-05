import mongoose from "mongoose";

// The data type 'String' must be capitalized.
const userSchema = new mongoose.Schema({
  email: {
    type: String, // Corrected from 'string' to 'String'
    required: true,
    unique: true,
  },
});

// Create the User model from the schema
const User = mongoose.model("User", userSchema);

// Export the User model directly, so it can be imported in your server.js file
export default User;
