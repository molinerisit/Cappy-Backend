const mongoose = require('mongoose');

// One document per user per calendar day
const choUsageSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date:       { type: String, required: true }, // 'YYYY-MM-DD'
    textCount:  { type: Number, default: 0 },
    imageCount: { type: Number, default: 0 },
  },
  { timestamps: false }
);

choUsageSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ChoUsage', choUsageSchema);
