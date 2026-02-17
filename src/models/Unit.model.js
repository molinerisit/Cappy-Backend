const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema({
  trackId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Track",
    required: true
  },
  title: { type: String, required: true },
  order: Number
}, { timestamps: true });

module.exports = mongoose.model("Unit", unitSchema);
