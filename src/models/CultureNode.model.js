const mongoose = require('mongoose');

const CultureNodeSchema = new mongoose.Schema({
  countryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  xp: {
    type: Number,
    default: 0
  },
  isLocked: {
    type: Boolean,
    default: true
  }
});

module.exports = mongoose.model('CultureNode', CultureNodeSchema);
