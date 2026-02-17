const mongoose = require('mongoose');
const Country = require('../models/Country.model');
const LearningPath = require('../models/LearningPath.model');
const LearningNode = require('../models/LearningNode.model');

const seedLearningPaths = async () => {
  try {
    console.log('Starting LearningPath seed...');

    // Get or create Italy as test country
    let italy = await Country.findOne({ code: 'IT' });
    if (!italy) {
      italy = await Country.create({
        name: 'Italia',
        code: 'IT',
        icon: '🇮🇹',
        description: 'Explora la rica tradición culinaria italiana',
        recipes: [],
        learningNodes: []
      });
      console.log('✓ Created Italy country');
    }

    // Create recipe nodes for Italy
    const pastaNode = await LearningNode.create({
      title: 'Pasta Desde Cero',
      description: 'Aprende a hacer pasta fresca italiana',
      type: 'recipe',
      difficulty: 'medium',
      xpReward: 100,
      order: 1,
      steps: [
        { title: 'Mezcla ingredientes', duration: 5 },
        { title: 'Amasa la masa', duration: 10 },
        { title: 'Deja reposar 30 min', duration: 30 },
        { title: 'Estira y corta', duration: 10 },
      ],
      ingredients: [
        { name: 'Harina', quantity: 300, unit: 'g' },
        { name: 'Huevos', quantity: 3, unit: 'count' },
        { name: 'Sal', quantity: 1, unit: 'pinch' },
      ],
      prepTime: 15,
      cookTime: 4,
      servings: 4,
      isPremium: false,
    });

    const risottoNode = await LearningNode.create({
      title: 'Risotto Milanés',
      description: 'Técnica clásica para hacer risotto perfecto',
      type: 'recipe',
      difficulty: 'hard',
      xpReward: 150,
      order: 2,
      requiredNodes: [pastaNode._id],
      steps: [
        { title: 'Tostar el arroz', duration: 3 },
        { title: 'Agregar caldo caliente', duration: 2 },
        { title: 'Remover constantemente', duration: 18 },
        { title: 'Agregar azafrán', duration: 2 },
        { title: 'Terminar con mantequilla y queso', duration: 2 },
      ],
      ingredients: [
        { name: 'Arroz Arborio', quantity: 300, unit: 'g' },
        { name: 'Caldo de vegetales', quantity: 1, unit: 'l' },
        { name: 'Vino blanco', quantity: 100, unit: 'ml' },
        { name: 'Cebolla', quantity: 1, unit: 'count' },
        { name: 'Azafrán', quantity: 1, unit: 'pinch' },
      ],
      prepTime: 10,
      cookTime: 20,
      servings: 4,
      isPremium: false,
    });

    const pizzaNode = await LearningNode.create({
      title: 'Pizza Napolitana',
      description: 'Aprende a hacer la auténtica pizza napolitana',
      type: 'recipe',
      difficulty: 'hard',
      xpReward: 120,
      order: 3,
      steps: [
        { title: 'Preparar la masa', duration: 30 },
        { title: 'Dejar fermentar 2 horas', duration: 120 },
        { title: 'Estirar la masa', duration: 5 },
        { title: 'Hornear a 400°C', duration: 3 },
      ],
      ingredients: [
        { name: 'Harina', quantity: 500, unit: 'g' },
        { name: 'Agua', quantity: 300, unit: 'ml' },
        { name: 'Levadura', quantity: 7, unit: 'g' },
        { name: 'Tomates San Marzano', quantity: 400, unit: 'g' },
        { name: 'Mozzarella fresca', quantity: 200, unit: 'g' },
      ],
      prepTime: 20,
      cookTime: 3,
      servings: 2,
      isPremium: true,
    });

    // Create culture nodes for Italy
    const historyNode = await LearningNode.create({
      title: 'Historia Culinaria Italiana',
      description: 'Descubre los orígenes de la cocina italiana',
      type: 'skill',
      difficulty: 'easy',
      xpReward: 50,
      order: 1,
      steps: [
        { title: 'Período antiguo', duration: 10 },
        { title: 'Edad Media', duration: 10 },
        { title: 'Renacimiento', duration: 10 },
        { title: 'Era moderna', duration: 10 },
      ],
      category: 'history',
      isPremium: false,
    });

    const regionsNode = await LearningNode.create({
      title: 'Regiones Gastronómicas',
      description: 'Explora las 20 regiones de Italia y sus platos típicos',
      type: 'skill',
      difficulty: 'medium',
      xpReward: 75,
      order: 2,
      steps: [
        { title: 'norte (Piamonte, Lombardía)', duration: 15 },
        { title: 'Centro (Toscana, Umbría)', duration: 15 },
        { title: 'Sur (Campania, Sicilia)', duration: 15 },
      ],
      category: 'geography',
      isPremium: false,
    });

    // Create LearningPath for Italy Recipes
    const italianRecipesPath = await LearningPath.create({
      type: 'country_recipe',
      countryId: italy._id,
      title: 'Recetas Italianas',
      description: 'Domina los clásicos de la cocina italiana',
      icon: '🍝',
      order: 1,
      nodes: [pastaNode._id, risottoNode._id, pizzaNode._id],
      metadata: {
        totalSteps: 17,
        estimatedDuration: '3-4 semanas',
        difficulty: 'medium'
      },
      isPremium: false,
      isActive: true
    });

    // Create LearningPath for Italy Culture
    const italianCulturePath = await LearningPath.create({
      type: 'country_culture',
      countryId: italy._id,
      title: 'Cultura Italiana',
      description: 'Entiende la historia y tradiciones culinarias italianas',
      icon: '🌍',
      order: 2,
      nodes: [historyNode._id, regionsNode._id],
      metadata: {
        totalSteps: 8,
        estimatedDuration: '2 semanas',
        difficulty: 'easy'
      },
      isPremium: false,
      isActive: true
    });

    // Update nodes with pathId
    await LearningNode.updateMany(
      { _id: { $in: [pastaNode._id, risottoNode._id, pizzaNode._id] } },
      { pathId: italianRecipesPath._id }
    );

    await LearningNode.updateMany(
      { _id: { $in: [historyNode._id, regionsNode._id] } },
      { pathId: italianCulturePath._id }
    );

    console.log('✓ Created Italy Recipe Path with 3 nodes');
    console.log('✓ Created Italy Culture Path with 2 nodes');

    // === Create Goal-based Learning Paths ===

    // Cooking School Goal
    const basicTechniquesNode = await LearningNode.create({
      title: 'Técnicas Básicas de Cocina',
      description: 'Domina los fundamentos: cortes, cocción, sazones',
      type: 'skill',
      difficulty: 'easy',
      xpReward: 80,
      order: 1,
      steps: [
        { title: 'Técnicas de corte', duration: 30 },
        { title: 'Métodos de cocción', duration: 30 },
        { title: 'Sazones y condimentos', duration: 30 },
      ],
      category: 'fundamentals',
      isPremium: false,
    });

    const advancedTechniquesNode = await LearningNode.create({
      title: 'Técnicas Avanzadas',
      description: 'Emulsiones, reducciones, y técnicas profesionales',
      type: 'skill',
      difficulty: 'hard',
      xpReward: 200,
      order: 2,
      requiredNodes: [basicTechniquesNode._id],
      steps: [
        { title: 'Emulsiones (mayonesa, holandesa)', duration: 30 },
        { title: 'Reducciones y concentración', duration: 30 },
        { title: 'Técnicas de chef profesional', duration: 60 },
      ],
      category: 'advanced',
      isPremium: true,
    });

    const cookingSchoolPath = await LearningPath.create({
      type: 'goal',
      goalType: 'cooking_school',
      title: 'Escuela de Cocina',
      description: 'Conviértete en un chef profesional con técnicas comprobadas',
      icon: '🍳',
      order: 1,
      nodes: [basicTechniquesNode._id, advancedTechniquesNode._id],
      metadata: {
        totalSteps: 6,
        estimatedDuration: '8 semanas',
        difficulty: 'hard'
      },
      isPremium: false,
      isActive: true
    });

    await LearningNode.updateMany(
      { _id: { $in: [basicTechniquesNode._id, advancedTechniquesNode._id] } },
      { pathId: cookingSchoolPath._id }
    );

    console.log('✓ Created Cooking School Goal Path');

    // Lose Weight Goal
    const balancedNutritionNode = await LearningNode.create({
      title: 'Nutrición Equilibrada',
      description: 'Aprende macronutrientes y planificación de comidas saludables',
      type: 'skill',
      difficulty: 'easy',
      xpReward: 60,
      order: 1,
      steps: [
        { title: 'Entender macronutrientes', duration: 20 },
        { title: 'Planificación de comidas', duration: 30 },
        { title: 'Control de porciones', duration: 20 },
      ],
      category: 'nutrition',
      isPremium: false,
    });

    const healthyRecipesNode = await LearningNode.create({
      title: 'Recetas Saludables Deliciosas',
      description: 'Cocina comidas bajas en calorías que saben bien',
      type: 'recipe',
      difficulty: 'medium',
      xpReward: 100,
      order: 2,
      requiredNodes: [balancedNutritionNode._id],
      steps: [
        { title: 'Proteínas magras', duration: 20 },
        { title: 'Vegetales abundantes', duration: 20 },
        { title: 'Cocción sin grasas', duration: 20 },
      ],
      ingredients: [
        { name: 'Pechuga de pollo', quantity: 200, unit: 'g' },
        { name: 'Brócoli', quantity: 300, unit: 'g' },
        { name: 'Limón', quantity: 1, unit: 'count' },
      ],
      prepTime: 10,
      cookTime: 15,
      servings: 2,
      isPremium: false,
    });

    const loseWeightPath = await LearningPath.create({
      type: 'goal',
      goalType: 'lose_weight',
      title: 'Perder Peso Saludablemente',
      description: 'Come delicioso mientras pierdes peso de forma sostenible',
      icon: '⚖️',
      order: 2,
      nodes: [balancedNutritionNode._id, healthyRecipesNode._id],
      metadata: {
        totalSteps: 5,
        estimatedDuration: '12 semanas',
        difficulty: 'easy'
      },
      isPremium: false,
      isActive: true
    });

    await LearningNode.updateMany(
      { _id: { $in: [balancedNutritionNode._id, healthyRecipesNode._id] } },
      { pathId: loseWeightPath._id }
    );

    console.log('✓ Created Lose Weight Goal Path');

    // Become Vegan Goal
    const veganBasicsNode = await LearningNode.create({
      title: 'Bases de la Cocina Vegana',
      description: 'Entiende la nutrición vegana y sustituciones inteligentes',
      type: 'skill',
      difficulty: 'easy',
      xpReward: 70,
      order: 1,
      steps: [
        { title: 'Proteínas veganas', duration: 20 },
        { title: 'Sustituciones de productos animales', duration: 20 },
        { title: 'Nutrientes clave (B12, hierro, omega)', duration: 30 },
      ],
      category: 'nutrition',
      isPremium: false,
    });

    const veganRecipesNode = await LearningNode.create({
      title: 'Recetas Veganas Deliciosas',
      description: 'Domina platos veganos sabrosos del mundo',
      type: 'recipe',
      difficulty: 'medium',
      xpReward: 110,
      order: 2,
      requiredNodes: [veganBasicsNode._id],
      steps: [
        { title: 'Tofu y tempeh', duration: 30 },
        { title: 'Legumbres y granos', duration: 30 },
        { title: 'Postres veganos', duration: 40 },
      ],
      ingredients: [
        { name: 'Tofu firme', quantity: 400, unit: 'g' },
        { name: 'Tamari', quantity: 30, unit: 'ml' },
        { name: 'Jengibre fresco', quantity: 20, unit: 'g' },
      ],
      prepTime: 15,
      cookTime: 20,
      servings: 4,
      isPremium: false,
    });

    const veganPath = await LearningPath.create({
      type: 'goal',
      goalType: 'become_vegan',
      title: 'Cocina Vegana',
      description: 'Transforma tu dieta a la cocina basada en plantas',
      icon: '🌱',
      order: 3,
      nodes: [veganBasicsNode._id, veganRecipesNode._id],
      metadata: {
        totalSteps: 5,
        estimatedDuration: '6 semanas',
        difficulty: 'medium'
      },
      isPremium: false,
      isActive: true
    });

    await LearningNode.updateMany(
      { _id: { $in: [veganBasicsNode._id, veganRecipesNode._id] } },
      { pathId: veganPath._id }
    );

    console.log('✓ Created Become Vegan Goal Path');
    console.log('\n✅ LearningPath seed completed successfully!');
    console.log(`
    Summary:
    - Italy Country with 2 paths (Recipes + Culture) and 5 nodes
    - 3 Goal-based paths: Cooking School, Lose Weight, Become Vegan
    - Total: 5 LearningPaths, 10 LearningNodes
    `);

  } catch (error) {
    console.error('❌ Error seeding LearningPaths:', error.message);
    throw error;
  }
};

module.exports = seedLearningPaths;
