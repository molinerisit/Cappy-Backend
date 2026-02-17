const mongoose = require('mongoose');
require('dotenv').config();

const Country = require('../models/Country.model');
const LearningPath = require('../models/LearningPath.model');
const LearningNode = require('../models/LearningNode.model');

/**
 * SEED COMPLETE SYSTEM
 * Creates:
 * - 20 Countries
 * - 2 Learning Paths per country (recipe + culture)
 * - 3 Goal Learning Paths
 * - Multiple nodes per path
 */

const seedCompleteSystem = async () => {
  try {
    console.log('🌱 Starting complete system seed...');

    // ===============================
    // 1. CREATE COUNTRIES
    // ===============================
    await Country.deleteMany({});
    
    const countries = [
      { name: 'Argentina', code: 'AR', icon: '🇦🇷', order: 1 },
      { name: 'México', code: 'MX', icon: '🇲🇽', order: 2 },
      { name: 'Perú', code: 'PE', icon: '🇵🇪', order: 3 },
      { name: 'Brasil', code: 'BR', icon: '🇧🇷', order: 4 },
      { name: 'Colombia', code: 'CO', icon: '🇨🇴', order: 5 },
      { name: 'Chile', code: 'CL', icon: '🇨🇱', order: 6 },
      { name: 'Italia', code: 'IT', icon: '🇮🇹', order: 7 },
      { name: 'España', code: 'ES', icon: '🇪🇸', order: 8 },
      { name: 'Francia', code: 'FR', icon: '🇫🇷', order: 9 },
      { name: 'Alemania', code: 'DE', icon: '🇩🇪', order: 10 },
      { name: 'Grecia', code: 'GR', icon: '🇬🇷', order: 11 },
      { name: 'China', code: 'CN', icon: '🇨🇳', order: 12 },
      { name: 'Japón', code: 'JP', icon: '🇯🇵', order: 13 },
      { name: 'Corea', code: 'KR', icon: '🇰🇷', order: 14 },
      { name: 'India', code: 'IN', icon: '🇮🇳', order: 15 },
      { name: 'Tailandia', code: 'TH', icon: '🇹🇭', order: 16 },
      { name: 'Estados Unidos', code: 'US', icon: '🇺🇸', order: 17 },
      { name: 'Turquía', code: 'TR', icon: '🇹🇷', order: 18 },
      { name: 'Marruecos', code: 'MA', icon: '🇲🇦', order: 19 },
      { name: 'Líbano', code: 'LB', icon: '🇱🇧', order: 20 },
    ];

    const createdCountries = await Country.insertMany(countries);
    console.log(`✅ Created ${createdCountries.length} countries`);

    // ===============================
    // 2. CREATE LEARNING PATHS
    // ===============================
    await LearningPath.deleteMany({});
    await LearningNode.deleteMany({});

    let totalPaths = 0;
    let totalNodes = 0;

    // Create paths for first 5 countries (sample)
    const sampleCountries = createdCountries.slice(0, 5);

    for (const country of sampleCountries) {
      // =============================
      // RECIPE PATH
      // =============================
      const recipePath = await LearningPath.create({
        type: 'country_recipe',
        countryId: country._id,
        title: `Recetas de ${country.name}`,
        description: `Aprende a cocinar los platos más emblemáticos de ${country.name}`,
        icon: '🍳',
        order: country.order * 2 - 1,
        isPremium: false,
        nodes: [],
      });
      totalPaths++;

      // Create 3 recipe nodes
      const recipeNodes = [];
      for (let i = 1; i <= 3; i++) {
        const node = await LearningNode.create({
          pathId: recipePath._id,
          title: `Receta ${i} - ${country.name}`,
          description: `Plato tradicional #${i}`,
          type: 'recipe',
          difficulty: i === 1 ? 'easy' : i === 2 ? 'medium' : 'hard',
          xpReward: i * 50,
          order: i,
          steps: [
            {
              title: 'Preparar ingredientes',
              instruction: 'Lava y corta todos los ingredientes necesarios',
              type: 'text',
              duration: 300
            },
            {
              title: 'Cocinar',
              instruction: 'Cocina según la técnica tradicional',
              type: 'text',
              duration: 600
            },
            {
              title: 'Emplatado',
              instruction: 'Presenta el plato de forma atractiva',
              type: 'text',
              duration: 180
            }
          ],
          ingredients: [
            { name: 'Ingrediente principal', quantity: 200, unit: 'g' },
            { name: 'Condimento', quantity: 10, unit: 'g' }
          ],
          prepTime: 15 + i * 5,
          cookTime: 20 + i * 10,
          servings: 4,
          isPremium: false,
          requiredNodes: i > 1 ? [recipeNodes[i - 2]._id] : []
        });
        recipeNodes.push(node);
        totalNodes++;
      }

      recipePath.nodes = recipeNodes.map(n => n._id);
      await recipePath.save();

      // =============================
      // CULTURE PATH
      // =============================
      const culturePath = await LearningPath.create({
        type: 'country_culture',
        countryId: country._id,
        title: `Cultura de ${country.name}`,
        description: `Descubre la historia y tradiciones culinarias de ${country.name}`,
        icon: '📖',
        order: country.order * 2,
        isPremium: false,
        nodes: [],
      });
      totalPaths++;

      // Create 2 culture nodes
      const cultureNodes = [];
      for (let i = 1; i <= 2; i++) {
        const node = await LearningNode.create({
          pathId: culturePath._id,
          title: `Lección Cultural ${i} - ${country.name}`,
          description: `Tradiciones culinarias #${i}`,
          type: 'skill',
          difficulty: 'easy',
          xpReward: 30,
          order: i,
          steps: [
            {
              title: 'Historia del plato',
              instruction: `Aprende sobre el origen histórico de la cocina ${country.name}`,
              type: 'text',
              duration: 240
            },
            {
              title: 'Contexto cultural',
              instruction: 'Comprende el contexto cultural y social',
              type: 'text',
              duration: 180
            },
            {
              title: 'Variaciones regionales',
              instruction: 'Descubre las variaciones según la región',
              type: 'text',
              duration: 120
            }
          ],
          isPremium: false,
          requiredNodes: i > 1 ? [cultureNodes[i - 2]._id] : []
        });
        cultureNodes.push(node);
        totalNodes++;
      }

      culturePath.nodes = cultureNodes.map(n => n._id);
      await culturePath.save();
    }

    // ===============================
    // 3. CREATE GOAL PATHS
    // ===============================
    
    // GOAL 1: Escuela de Cocina
    const cookingSchoolPath = await LearningPath.create({
      type: 'goal',
      goalType: 'cooking_school',
      title: 'Escuela de Cocina',
      description: 'Aprende desde cero las técnicas fundamentales',
      icon: '👨‍🍳',
      order: 1001,
      isPremium: true,
      nodes: []
    });
    totalPaths++;

    const schoolNodes = [];
    const schoolTopics = [
      { title: 'Técnicas Básicas de Corte', xp: 80 },
      { title: 'Cocciones Fundamentales', xp: 100 },
      { title: 'Las 5 Salsas Madre', xp: 150 },
      { title: 'Manejo de Especias', xp: 120 }
    ];

    for (let i = 0; i < schoolTopics.length; i++) {
      const topic = schoolTopics[i];
      const node = await LearningNode.create({
        pathId: cookingSchoolPath._id,
        title: topic.title,
        description: `Domina ${topic.title.toLowerCase()}`,
        type: 'skill',
        difficulty: i < 2 ? 'easy' : 'medium',
        xpReward: topic.xp,
        order: i + 1,
        steps: [
          {
            title: 'Introducción teórica',
            instruction: 'Aprende los conceptos fundamentales',
            type: 'text',
            duration: 300
          },
          {
            title: 'Práctica guiada',
            instruction: 'Sigue los pasos con ayuda visual',
            type: 'interactive',
            duration: 600
          },
          {
            title: 'Ejercicio de dominio',
            instruction: 'Demuestra tu habilidad',
            type: 'quiz',
            duration: 240
          }
        ],
        isPremium: true,
        requiredNodes: i > 0 ? [schoolNodes[i - 1]._id] : []
      });
      schoolNodes.push(node);
      totalNodes++;
    }

    cookingSchoolPath.nodes = schoolNodes.map(n => n._id);
    await cookingSchoolPath.save();

    // GOAL 2: Perder Peso
    const loseWeightPath = await LearningPath.create({
      type: 'goal',
      goalType: 'lose_weight',
      title: 'Déficit Suave',
      description: 'Recetas saludables y bajas en calorías',
      icon: '💪',
      order: 1002,
      isPremium: false,
      nodes: []
    });
    totalPaths++;

    const weightNodes = [];
    const weightTopics = [
      { title: 'Snacks Saludables', xp: 60 },
      { title: 'Ensaladas Completas', xp: 70 },
      { title: 'Proteína Magra', xp: 90 }
    ];

    for (let i = 0; i < weightTopics.length; i++) {
      const topic = weightTopics[i];
      const node = await LearningNode.create({
        pathId: loseWeightPath._id,
        title: topic.title,
        description: `Aprende a preparar ${topic.title.toLowerCase()}`,
        type: 'recipe',
        difficulty: 'easy',
        xpReward: topic.xp,
        order: i + 1,
        steps: [
          {
            title: 'Selección de ingredientes',
            instruction: 'Elige ingredientes bajos en calorías',
            type: 'checklist',
            checklist: [
              { item: 'Vegetales frescos', required: true },
              { item: 'Proteína magra', required: true }
            ],
            duration: 180
          },
          {
            title: 'Preparación baja en calorías',
            instruction: 'Cocina con técnicas saludables',
            type: 'text',
            duration: 420
          },
          {
            title: 'Control de porciones',
            instruction: 'Aprende a medir las porciones correctamente',
            type: 'text',
            duration: 120
          }
        ],
        nutrition: {
          calories: 200 + i * 50,
          protein: 20,
          carbs: 15,
          fat: 5
        },
        isPremium: false,
        requiredNodes: i > 0 ? [weightNodes[i - 1]._id] : []
      });
      weightNodes.push(node);
      totalNodes++;
    }

    loseWeightPath.nodes = weightNodes.map(n => n._id);
    await loseWeightPath.save();

    // GOAL 3: Volverse Vegano
    const veganPath = await LearningPath.create({
      type: 'goal',
      goalType: 'become_vegan',
      title: 'Volverse Vegano',
      description: 'Cocina 100% vegetal y deliciosa',
      icon: '🌱',
      order: 1003,
      isPremium: false,
      nodes: []
    });
    totalPaths++;

    const veganNodes = [];
    const veganTopics = [
      { title: 'Proteínas Vegetales', xp: 70 },
      { title: 'Leches y Quesos Veganos', xp: 80 },
      { title: 'Postres Sin Lácteos', xp: 100 }
    ];

    for (let i = 0; i < veganTopics.length; i++) {
      const topic = veganTopics[i];
      const node = await LearningNode.create({
        pathId: veganPath._id,
        title: topic.title,
        description: `Domina ${topic.title.toLowerCase()}`,
        type: 'recipe',
        difficulty: i < 2 ? 'easy' : 'medium',
        xpReward: topic.xp,
        order: i + 1,
        steps: [
          {
            title: 'Alternativas plant-based',
            instruction: 'Conoce las mejores alternativas vegetales',
            type: 'text',
            duration: 240
          },
          {
            title: 'Técnicas de preparación',
            instruction: 'Aprende técnicas específicas para cocina vegana',
            type: 'text',
            duration: 480
          },
          {
            title: 'Receta completa',
            instruction: 'Prepara un plato vegano completo',
            type: 'interactive',
            duration: 720
          }
        ],
        isPremium: false,
        requiredNodes: i > 0 ? [veganNodes[i - 1]._id] : []
      });
      veganNodes.push(node);
      totalNodes++;
    }

    veganPath.nodes = veganNodes.map(n => n._id);
    await veganPath.save();

    // ===============================
    // SUMMARY
    // ===============================
    console.log('\n✅ SEED COMPLETE!');
    console.log('==================');
    console.log(`🗺️  Countries: ${createdCountries.length}`);
    console.log(`📚 Learning Paths: ${totalPaths}`);
    console.log(`   - Country Recipes: ${sampleCountries.length}`);
    console.log(`   - Country Culture: ${sampleCountries.length}`);
    console.log(`   - Goals: 3`);
    console.log(`📝 Learning Nodes: ${totalNodes}`);
    console.log('==================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  const connectDB = require('./db');
  connectDB()
    .then(() => {
      console.log('📡 Database connected');
      return seedCompleteSystem();
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = seedCompleteSystem;
