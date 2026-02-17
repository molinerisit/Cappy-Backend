const Path = require("../models/Path.model");

const seedPaths = async () => {
  try {
    const count = await Path.countDocuments();
    if (count > 0) {
      console.log("Paths already seeded");
      return;
    }

    const paths = [
      { type: "country", name: "Argentina", icon: "AR", description: "Classic Argentine flavors", difficultyOrder: 1 },
      { type: "country", name: "Mexico", icon: "MX", description: "Bold spices and street food", difficultyOrder: 2 },
      { type: "country", name: "Peru", icon: "PE", description: "Ceviche and Andean roots", difficultyOrder: 3 },
      { type: "country", name: "Brazil", icon: "BR", description: "Hearty stews and grills", difficultyOrder: 4 },
      { type: "country", name: "Colombia", icon: "CO", description: "Comforting regional dishes", difficultyOrder: 5 },
      { type: "country", name: "Chile", icon: "CL", description: "Coastal and mountain fare", difficultyOrder: 6 },
      { type: "country", name: "Italy", icon: "IT", description: "Pasta, pizza, and sauces", difficultyOrder: 7 },
      { type: "country", name: "Spain", icon: "ES", description: "Tapas and paella", difficultyOrder: 8 },
      { type: "country", name: "France", icon: "FR", description: "Classic techniques", difficultyOrder: 9 },
      { type: "country", name: "Germany", icon: "DE", description: "Hearty comfort food", difficultyOrder: 10 },
      { type: "country", name: "Greece", icon: "GR", description: "Mediterranean staples", difficultyOrder: 11 },
      { type: "country", name: "China", icon: "CN", description: "Woks and stir fry", difficultyOrder: 12 },
      { type: "country", name: "Japan", icon: "JP", description: "Precision and balance", difficultyOrder: 13 },
      { type: "country", name: "Korea", icon: "KR", description: "Ferments and spice", difficultyOrder: 14 },
      { type: "country", name: "India", icon: "IN", description: "Aromatic spice blends", difficultyOrder: 15 },
      { type: "country", name: "Thailand", icon: "TH", description: "Sweet, sour, spicy", difficultyOrder: 16 },
      { type: "country", name: "United States", icon: "US", description: "Regional comfort classics", difficultyOrder: 17 },
      { type: "country", name: "Turkey", icon: "TR", description: "Meze and grills", difficultyOrder: 18 },
      { type: "country", name: "Morocco", icon: "MA", description: "Tagines and spices", difficultyOrder: 19 },
      { type: "country", name: "Lebanon", icon: "LB", description: "Fresh herbs and mezze", difficultyOrder: 20 },
      { type: "goal", name: "Deficit suave", icon: "GOAL1", description: "Lower calorie meals", difficultyOrder: 101 },
      { type: "goal", name: "Aprender a cocinar desde cero", icon: "GOAL2", description: "Core cooking fundamentals", difficultyOrder: 102 }
    ];

    await Path.insertMany(paths);
    console.log("Paths seeded successfully");
  } catch (error) {
    console.error("Error seeding paths:", error.message);
  }
};

module.exports = seedPaths;
