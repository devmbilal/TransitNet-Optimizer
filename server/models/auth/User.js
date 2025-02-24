const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  userID: { type: String, required: true, unique: true }, // PK (Primary Key)
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  userType: { 
    type: String, 
    enum: ["PolicyMaker", "Engineer"], 
    required: true 
  },
  organization: { type: String, default: "" } 
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
