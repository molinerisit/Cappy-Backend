const mongoose = require('mongoose');

const choLogSchema = new mongoose.Schema(
  {
    userId:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipeId:        { type: String, default: null },
    recipeName:      { type: String, default: '' },
    stepIndex:       { type: Number, default: 0 },
    stepDescription: { type: String, default: '' },
    message:         { type: String, required: true },
    response:        { type: String, required: true },
    hasImage:        { type: Boolean, default: false },
    imageMeta:       { width: Number, height: Number, sizeKb: Number }, // no raw image saved
    isPremium:       { type: Boolean, default: false },
    elapsedTime:     { type: Number, default: 0 }, // seconds user has been on recipe
    usedFallback:    { type: Boolean, default: false },
    tokensUsed:      { type: Number, default: 0 },
  },
  { timestamps: true }
);

choLogSchema.index({ userId: 1, createdAt: -1 });
choLogSchema.index({ createdAt: -1 });
choLogSchema.index({ recipeId: 1 });

module.exports = mongoose.model('ChoLog', choLogSchema);
