const mongoose = require("mongoose");

const trackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["country", "diet"], required: true },
  flag: String,
  description: String,
  order: Number
}, { timestamps: true });

module.exports = mongoose.model("Track", trackSchema);
