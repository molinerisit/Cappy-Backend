const mongoose = require('mongoose');

const RecipeStepSchema = new mongoose.Schema({
  recipeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recipe',
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
  image: {
    type: String
  },
  hasTimer: {
    type: Boolean,
    default: false
  },
  timerDurationSeconds: {
    type: Number
  }
});

module.exports = mongoose.model('RecipeStep', RecipeStepSchema);
