const mongoose = require('mongoose');

const CultureStepSchema = new mongoose.Schema({
  cultureNodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CultureNode',
    required: true
  },
  type: {
    type: String,
    enum: ['lesson', 'article', 'quiz'],
    required: true
  },
  content: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('CultureStep', CultureStepSchema);
