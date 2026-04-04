const mongoose = require('mongoose');

const choConfigSchema = new mongoose.Schema(
  {
    isEnabled:   { type: Boolean, default: true },
    updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Limits (readable in admin but not editable from UI for safety)
    limits: {
      free:    { daily: { type: Number, default: 3 }, images: { type: Number, default: 1 } },
      premium: { daily: { type: Number, default: -1 }, images: { type: Number, default: 3 } }, // -1 = unlimited
    },
  },
  { timestamps: true }
);

// Singleton: always upsert the same doc
choConfigSchema.statics.get = async function () {
  let cfg = await this.findOne();
  if (!cfg) cfg = await this.create({});
  return cfg;
};

module.exports = mongoose.model('ChoConfig', choConfigSchema);
