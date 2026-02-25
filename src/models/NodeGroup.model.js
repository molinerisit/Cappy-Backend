const mongoose = require('mongoose');

const nodeGroupSchema = new mongoose.Schema(
  {
    pathId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningPath',
      required: true
    },
    title: { type: String, required: true },
    order: { type: Number, default: 1 },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

nodeGroupSchema.index({ pathId: 1, order: 1 });

module.exports = mongoose.model('NodeGroup', nodeGroupSchema);
