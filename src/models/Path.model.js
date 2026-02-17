const mongoose = require("mongoose");

const pathSchema = new mongoose.Schema({
  type: { type: String, enum: ["country", "goal"], required: true },
  name: { type: String, required: true },
  icon: { type: String },
  description: { type: String },
  difficultyOrder: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model("Path", pathSchema);
