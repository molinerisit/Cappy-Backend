const Technique = require('../models/technique.model');

const seedTechniques = async () => {
  try {
    const count = await Technique.countDocuments();
    if (count > 0) {
      console.log('Techniques already seeded');
      return;
    }

  await Technique.insertMany([

    {
      name: "Protein Searing",
      difficulty: 1,
      estimatedTime: 15,
      dietCompatibility: ["none", "high_protein"],
      compatibleIngredients: ["chicken", "beef", "egg"],
      stepsTemplate: [
        { order: 1, instruction: "Heat pan over medium-high heat", timer: 60 },
        { order: 2, instruction: "Add protein and do not move it", timer: 180 },
        { order: 3, instruction: "Flip once golden brown", timer: 180 },
        { order: 4, instruction: "Rest protein before serving", timer: 120 }
      ]
    },

    {
      name: "Basic Vegetable Saute",
      difficulty: 1,
      estimatedTime: 10,
      dietCompatibility: ["none", "vegetarian"],
      compatibleIngredients: ["carrot", "onion", "pepper", "zucchini"],
      stepsTemplate: [
        { order: 1, instruction: "Heat pan with small amount of oil", timer: 60 },
        { order: 2, instruction: "Add vegetables evenly", timer: 240 },
        { order: 3, instruction: "Stir occasionally until soft", timer: 240 }
      ]
    },

    {
      name: "Oven Roasting",
      difficulty: 2,
      estimatedTime: 30,
      dietCompatibility: ["none", "vegetarian", "high_protein"],
      compatibleIngredients: ["potato", "chicken", "carrot", "pumpkin"],
      stepsTemplate: [
        { order: 1, instruction: "Preheat oven to 200°C", timer: 300 },
        { order: 2, instruction: "Place ingredients on tray evenly", timer: 0 },
        { order: 3, instruction: "Roast until golden", timer: 1200 }
      ]
    }

  ]);

  console.log('Techniques seeded successfully');
  } catch (error) {
    console.error('Error seeding techniques:', error.message);
  }
};

module.exports = seedTechniques;
