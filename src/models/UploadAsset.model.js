const mongoose = require('mongoose');

const uploadAssetSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true, unique: true },
    format: { type: String, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    size: { type: Number, default: null },
    sourceType: { type: String, enum: ['file', 'url'], required: true },
    sourceUrl: { type: String, default: null },
    originalFilename: { type: String, default: null },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

uploadAssetSchema.index({ uploadedBy: 1, createdAt: -1 });

module.exports = mongoose.model('UploadAsset', uploadAssetSchema);
