const mongoose = require('mongoose');
require('dotenv').config();

const Country = require('../src/models/Country.model');
const LearningPath = require('../src/models/LearningPath.model');
const LearningNode = require('../src/models/LearningNode.model');
const NodeGroup = require('../src/models/NodeGroup.model');
const Recipe = require('../src/models/Recipe.model');
const Culture = require('../src/models/Culture.model');
const RecipeStep = require('../src/models/RecipeStep.model');
const CultureStep = require('../src/models/CultureStep.model');

const IMAGE_URL = 'https://img.freepik.com/vector-gratis/personaje-dibujos-animados-nino-chef-cocinando-comida_1308-54445.jpg?semt=ais_user_personalization&w=740&q=80';
const VIDEO_URL = 'https://i.pinimg.com/originals/a4/35/40/a43540aa47a915a343dca733b3c7bb96.gif';

async function seedFullDemo() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cooklevel';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      Country.deleteMany({}),
      LearningPath.deleteMany({}),
      LearningNode.deleteMany({}),
      NodeGroup.deleteMany({}),
      Recipe.deleteMany({}),
      Culture.deleteMany({}),
      RecipeStep.deleteMany({}),
      CultureStep.deleteMany({}),
    ]);

    console.log('Cleared existing data');

    // Countries
    const [argentina, mexico, italy] = await Country.insertMany([
      {
        name: 'Argentina',
        code: 'AR',
        icon: '🇦🇷',
        description: 'Sabores tradicionales argentinos',
        order: 1,
        isActive: true,
        isPremium: false,
      },
      {
        name: 'Mexico',
        code: 'MX',
        icon: '🇲🇽',
        description: 'Cocina mexicana y su cultura',
        order: 2,
        isActive: true,
        isPremium: false,
      },
      {
        name: 'Italia',
        code: 'IT',
        icon: '🇮🇹',
        description: 'Tecnicas italianas y recetas clasicas',
        order: 3,
        isActive: true,
        isPremium: false,
      },
    ]);

    // Goal paths
    const cookingSchoolPath = await LearningPath.create({
      type: 'goal',
      goalType: 'cooking_school',
      title: 'Aprender a Cocinar',
      description: 'Fundamentos y tecnicas para cocinar desde cero',
      icon: '👨‍🍳',
      order: 1,
      isPremium: true,
      nodes: [],
    });

    const loseWeightPath = await LearningPath.create({
      type: 'goal',
      goalType: 'lose_weight',
      title: 'Bajar de Peso',
      description: 'Habitos y recetas para una alimentacion saludable',
      icon: '⚖️',
      order: 2,
      isPremium: true,
      nodes: [],
    });

    const veganPath = await LearningPath.create({
      type: 'goal',
      goalType: 'become_vegan',
      title: 'Volverse Vegano',
      description: 'Transicion completa a la cocina vegana',
      icon: '🌱',
      order: 3,
      isPremium: true,
      nodes: [],
    });

    // Country paths
    const argentinaRecipePath = await LearningPath.create({
      type: 'country_recipe',
      countryId: argentina._id,
      title: 'Recetas de Argentina',
      description: 'Platos clasicos y tecnicas locales',
      icon: '🍳',
      order: 10,
      isPremium: false,
      nodes: [],
    });

    const argentinaCulturePath = await LearningPath.create({
      type: 'country_culture',
      countryId: argentina._id,
      title: 'Cultura de Argentina',
      description: 'Historia culinaria y tradiciones',
      icon: '📖',
      order: 11,
      isPremium: false,
      nodes: [],
    });

    const mexicoRecipePath = await LearningPath.create({
      type: 'country_recipe',
      countryId: mexico._id,
      title: 'Recetas de Mexico',
      description: 'Cocina mexicana autentica',
      icon: '🌮',
      order: 12,
      isPremium: false,
      nodes: [],
    });

    // Node groups
    const [cookingBasicsGroup, cookingTechGroup] = await NodeGroup.insertMany([
      { pathId: cookingSchoolPath._id, title: 'Fundamentos', order: 1 },
      { pathId: cookingSchoolPath._id, title: 'Tecnicas', order: 2 },
    ]);

    const [loseWeightGroup] = await NodeGroup.insertMany([
      { pathId: loseWeightPath._id, title: 'Habitos', order: 1 },
    ]);

    const [veganGroup] = await NodeGroup.insertMany([
      { pathId: veganPath._id, title: 'Bases Veganas', order: 1 },
    ]);

    // Cooking school nodes
    const safetyNode = await LearningNode.create({
      pathId: cookingSchoolPath._id,
      groupId: cookingBasicsGroup._id,
      groupTitle: cookingBasicsGroup.title,
      title: 'Seguridad en la Cocina',
      description: 'Reglas basicas para evitar accidentes',
      type: 'explanation',
      status: 'active',
      level: 1,
      positionIndex: 1,
      xpReward: 40,
      steps: [
        {
          title: 'Introduccion',
          order: 1,
          cards: [
            {
              type: 'text',
              data: { text: 'Mantene tu espacio limpio, cuchillos afilados y manos secas.' },
            },
            {
              type: 'image',
              data: { imageUrl: IMAGE_URL, caption: 'Postura segura y controlada.' },
            },
          ],
        },
      ],
      metadata: { tags: ['seguridad', 'basico'] },
    });

    const knifeNode = await LearningNode.create({
      pathId: cookingSchoolPath._id,
      groupId: cookingBasicsGroup._id,
      groupTitle: cookingBasicsGroup.title,
      title: 'Cortes Basicos',
      description: 'Juliana, brunoise y chiffonade',
      type: 'technique',
      status: 'active',
      level: 1,
      positionIndex: 2,
      xpReward: 60,
      steps: [
        {
          title: 'Checklist de practica',
          order: 1,
          cards: [
            {
              type: 'list',
              data: { items: ['Tabla firme', 'Cuchillo afilado', 'Verduras limpias'] },
            },
          ],
        },
        {
          title: 'Quiz rapido',
          order: 2,
          cards: [
            {
              type: 'quiz',
              data: {
                question: 'Que corte es el mas pequeno?',
                options: ['Juliana', 'Brunoise', 'Chiffonade', 'Rodajas'],
                correctIndex: 1,
              },
            },
          ],
        },
      ],
      metadata: { tags: ['cuchillos', 'tecnica'] },
    });

    const saucesNode = await LearningNode.create({
      pathId: cookingSchoolPath._id,
      groupId: cookingTechGroup._id,
      groupTitle: cookingTechGroup.title,
      title: 'Salsas Base',
      description: 'Tomate, blanca y reducción',
      type: 'recipe',
      status: 'active',
      level: 2,
      positionIndex: 1,
      xpReward: 90,
      steps: [
        {
          title: 'Salsa de tomate',
          order: 1,
          cards: [
            {
              type: 'text',
              data: { text: 'Sofrei cebolla y ajo, agrega tomate triturado y reduce.' },
            },
            {
              type: 'video',
              data: { videoUrl: VIDEO_URL },
            },
          ],
        },
        {
          title: 'Timer de coccion',
          order: 2,
          cards: [
            {
              type: 'timer',
              data: { duration: 10 },
            },
          ],
        },
      ],
      metadata: { tags: ['salsas', 'base'] },
    });

    // Linked node example
    const miseEnPlaceNode = await LearningNode.create({
      pathId: cookingSchoolPath._id,
      groupId: cookingBasicsGroup._id,
      groupTitle: cookingBasicsGroup.title,
      title: 'Mise en Place',
      description: 'Organiza ingredientes y herramientas antes de cocinar',
      type: 'tips',
      status: 'active',
      level: 2,
      positionIndex: 2,
      xpReward: 30,
      steps: [
        {
          title: 'Orden y limpieza',
          order: 1,
          cards: [
            {
              type: 'text',
              data: { text: 'Prepara todos los ingredientes y utensilios antes de empezar.' },
            },
          ],
        },
      ],
      metadata: { tags: ['organizacion'] },
    });

    const miseEnPlaceLinked = await LearningNode.create({
      pathId: loseWeightPath._id,
      groupId: loseWeightGroup._id,
      groupTitle: loseWeightGroup.title,
      title: 'Mise en Place',
      description: 'Planificacion para cocinar saludable',
      type: 'tips',
      status: 'active',
      level: 1,
      positionIndex: 1,
      xpReward: 20,
      originalNodeId: miseEnPlaceNode._id,
      isLinked: true,
      steps: miseEnPlaceNode.steps,
      metadata: { tags: ['organizacion', 'saludable'] },
    });

    // Lose weight nodes
    const mealPrepNode = await LearningNode.create({
      pathId: loseWeightPath._id,
      groupId: loseWeightGroup._id,
      groupTitle: loseWeightGroup.title,
      title: 'Meal Prep Inteligente',
      description: 'Planifica la semana en 30 minutos',
      type: 'explanation',
      status: 'active',
      level: 1,
      positionIndex: 2,
      xpReward: 60,
      steps: [
        {
          title: 'Plan semanal',
          order: 1,
          cards: [
            {
              type: 'text',
              data: { text: 'Define menus, lista de compras y porciones.' },
            },
            {
              type: 'list',
              data: { items: ['Proteinas magras', 'Vegetales', 'Carbohidratos integrales'] },
            },
          ],
        },
      ],
      metadata: { tags: ['mealprep'] },
    });

    // Vegan nodes
    const plantProteinNode = await LearningNode.create({
      pathId: veganPath._id,
      groupId: veganGroup._id,
      groupTitle: veganGroup.title,
      title: 'Proteinas Vegetales',
      description: 'Legumbres, tofu y frutos secos',
      type: 'explanation',
      status: 'active',
      level: 1,
      positionIndex: 1,
      xpReward: 50,
      steps: [
        {
          title: 'Fuentes clave',
          order: 1,
          cards: [
            {
              type: 'text',
              data: { text: 'Lentejas, garbanzos, porotos, tofu y tempeh.' },
            },
          ],
        },
      ],
      metadata: { tags: ['proteina'] },
    });

    const tofuNode = await LearningNode.create({
      pathId: veganPath._id,
      groupId: veganGroup._id,
      groupTitle: veganGroup.title,
      title: 'Tofu Crujiente',
      description: 'Preparacion sencilla en sartén',
      type: 'recipe',
      status: 'active',
      level: 2,
      positionIndex: 1,
      xpReward: 80,
      steps: [
        {
          title: 'Marinar tofu',
          order: 1,
          cards: [
            {
              type: 'text',
              data: { text: 'Marina el tofu con salsa de soja y ajo por 15 min.' },
            },
            {
              type: 'image',
              data: { imageUrl: IMAGE_URL },
            },
          ],
        },
      ],
      metadata: { tags: ['tofu', 'vegano'] },
    });

    const veganSauceNode = await LearningNode.create({
      pathId: veganPath._id,
      groupId: veganGroup._id,
      groupTitle: veganGroup.title,
      title: 'Salsa Vegana de Anacardos',
      description: 'Cremosa y nutritiva',
      type: 'recipe',
      status: 'active',
      level: 2,
      positionIndex: 2,
      xpReward: 70,
      steps: [
        {
          title: 'Licuar anacardos',
          order: 1,
          cards: [
            {
              type: 'video',
              data: { videoUrl: VIDEO_URL },
            },
            {
              type: 'text',
              data: { text: 'Agrega agua tibia y condimentos a gusto.' },
            },
          ],
        },
      ],
      metadata: { tags: ['salsa', 'vegano'] },
    });

    // Save nodes to paths
    cookingSchoolPath.nodes = [
      safetyNode._id,
      knifeNode._id,
      saucesNode._id,
      miseEnPlaceNode._id,
    ];
    loseWeightPath.nodes = [miseEnPlaceLinked._id, mealPrepNode._id];
    veganPath.nodes = [plantProteinNode._id, tofuNode._id, veganSauceNode._id];
    argentinaRecipePath.nodes = [];
    argentinaCulturePath.nodes = [];
    mexicoRecipePath.nodes = [];

    await Promise.all([
      cookingSchoolPath.save(),
      loseWeightPath.save(),
      veganPath.save(),
      argentinaRecipePath.save(),
      argentinaCulturePath.save(),
      mexicoRecipePath.save(),
    ]);

    // Recipes
    await Recipe.insertMany([
      {
        countryId: argentina._id,
        title: 'Provoleta Clasica',
        description: 'Queso provolone a la parrilla con oregano',
        difficulty: 1,
        xpReward: 50,
        servings: 2,
        prepTime: 10,
        cookTime: 8,
        imageUrl: IMAGE_URL,
        steps: [
          {
            id: '1',
            order: 1,
            title: 'Preparar la provoleta',
            instruction: 'Sazona con oregano y aji molido.',
          },
          {
            id: '2',
            order: 2,
            title: 'Cocinar',
            instruction: 'Cocina en plancha caliente 3 minutos por lado.',
            duration: 180,
          },
        ],
        ingredients: [
          { name: 'Provolone', quantity: '200', unit: 'g' },
          { name: 'Oregano', quantity: '1', unit: 'cdita' },
        ],
        tools: [{ name: 'Plancha', optional: false }],
        tags: ['parrilla', 'queso'],
        isPremium: false,
        isActive: true,
      },
      {
        countryId: mexico._id,
        title: 'Tacos de Pollo',
        description: 'Tacos rapidos con salsa fresca',
        difficulty: 2,
        xpReward: 70,
        servings: 3,
        prepTime: 15,
        cookTime: 15,
        imageUrl: IMAGE_URL,
        steps: [
          {
            id: '1',
            order: 1,
            title: 'Marinar pollo',
            instruction: 'Marina con limon y especias 20 minutos.',
          },
          {
            id: '2',
            order: 2,
            title: 'Saltear',
            instruction: 'Saltea hasta dorar.',
            duration: 600,
          },
        ],
        ingredients: [
          { name: 'Pollo', quantity: '400', unit: 'g' },
          { name: 'Tortillas', quantity: '6', unit: 'u' },
        ],
        tools: [{ name: 'Sarten', optional: false }],
        tags: ['mexico', 'tacos'],
        isPremium: false,
        isActive: true,
      },
    ]);

    // Culture content
    await Culture.insertMany([
      {
        countryId: argentina._id,
        title: 'Asado y Tradicion',
        description: 'Historia del asado argentino',
        category: 'tradition',
        difficulty: 'easy',
        xpReward: 40,
        imageUrl: IMAGE_URL,
        steps: [
          {
            id: '1',
            order: 1,
            type: 'text',
            title: 'Origen del asado',
            content: 'El asado surge de la cultura gaucha y la vida en la pampa.',
          },
          {
            id: '2',
            order: 2,
            type: 'video',
            title: 'El ritual',
            videoUrl: VIDEO_URL,
          },
        ],
        tags: ['asado', 'tradicion'],
        isPremium: false,
        isActive: true,
      },
      {
        countryId: mexico._id,
        title: 'Día de Muertos y su cocina',
        description: 'Recetas y simbolos de la tradicion',
        category: 'history',
        difficulty: 'easy',
        xpReward: 35,
        imageUrl: IMAGE_URL,
        steps: [
          {
            id: '1',
            order: 1,
            type: 'text',
            title: 'Pan de muerto',
            content: 'Historia del pan de muerto y su significado.',
          },
        ],
        tags: ['mexico', 'cultura'],
        isPremium: false,
        isActive: true,
      },
    ]);

    console.log('Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seedFullDemo();
