const mongoose = require("mongoose");

const studentMessageSchema = new mongoose.Schema({
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("StudentMessage", studentMessageSchema);
