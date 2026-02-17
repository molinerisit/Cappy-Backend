const mongoose = require('mongoose');
require('dotenv').config();

const Country = require('../src/models/Country.model');
const LearningNode = require('../src/models/LearningNode.model');

async function seedLearningData() {
  try {
    // Connect to MongoDB
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
    } else {
      await mongoose.connect('mongodb://localhost:27017/cooklevel');
    }

    console.log('Connected to MongoDB');

    // Clear existing data
    await Country.deleteMany({});
    await LearningNode.deleteMany({});

    console.log('Cleared existing data');

    // Create a country
    const italy = await Country.create({
      name: 'Italia',
      code: 'IT',
      icon: '🇮🇹',
      description: 'Aprende la gastronomía italiana',
      order: 1,
      isActive: true,
      isPremium: false,
      learningNodes: [],
      lessons: [],
    });

    console.log('Created country: Italia');

    // Create learning nodes
    const nodes = [
      {
        countryId: italy._id,
        title: 'Técnicas Básicas de Cuchillo',
        description: 'Aprende cómo sostener y usar correctamente un cuchillo de chef',
        type: 'skill',
        difficulty: 'easy',
        xpReward: 50,
        order: 1,
        level: 1,
        category: 'knife_skills',
        requiredNodes: [],
        steps: [
          {
            title: 'La Posición Correcta',
            instruction: 'Aprende cómo sostener correctamente el cuchillo. Tu pulgar y dedo índice deben estar en los lados de la hoja, cerca de la base.',
            type: 'text',
            duration: 300,
            tips: ['Relaja tu mano', 'Mantén los dedos alineados', 'La hoja debe estar afilada'],
          },
          {
            title: 'El Agarre del Alimento',
            instruction: 'Aprende la técnica del "garfio" para sostener seguramente el alimento mientras lo cortas.',
            type: 'text',
            duration: 300,
            tips: ['Dobla los dedos formando un garfio', 'Protege tus nudillos', 'Mueve lentamente'],
          },
          {
            title: 'Cortes Básicos',
            instruction: 'Practica los cortes básicos: brunoise, juliana y chiffonade.',
            type: 'text',
            duration: 600,
            feedback: '¡Excelente! Has aprendido los cortes básicos.',
          },
        ],
        tips: ['Practica regularmente', 'Usa cuchillos afilados', 'Seguridad primero'],
        tags: ['cuchillo', 'técnica', 'principiante'],
      },
      {
        countryId: italy._id,
        title: 'Pasta Fresca Casera',
        description: 'Haz tu propia pasta fresca desde cero',
        type: 'recipe',
        difficulty: 'medium',
        xpReward: 100,
        order: 2,
        level: 2,
        category: 'main_course',
        requiredNodes: [],
        servings: 4,
        prepTime: 30,
        cookTime: 15,
        ingredients: [
          {
            name: 'Harina',
            quantity: 300,
            unit: 'g',
            optional: false,
          },
          {
            name: 'Huevos',
            quantity: 3,
            unit: 'unidades',
            optional: false,
          },
          {
            name: 'Agua',
            quantity: 2,
            unit: 'cucharadas',
            optional: true,
          },
          {
            name: 'Sal',
            quantity: 1,
            unit: 'cucharadita',
            optional: false,
          },
        ],
        tools: [
          {
            name: 'Rodillo de pasta',
            optional: true,
          },
          {
            name: 'Máquina de pasta',
            optional: true,
          },
          {
            name: 'Tabla de cortar',
            optional: false,
          },
        ],
        nutrition: {
          calories: 350,
          protein: 12,
          carbs: 65,
          fat: 3,
        },
        steps: [
          {
            title: 'Preparar la Masa',
            instruction: 'Forma un volcán con la harina en una tabla. Rompe los huevos en el centro y mezcla con un tenedor. Agrega un poco de agua si es necesario.',
            type: 'text',
            duration: 300,
            tips: ['Mezcla lentamente para que no se escape la yema', 'La consistencia debe ser firme pero flexible'],
            checklist: [
              {
                item: 'Harina medida',
                required: true,
              },
              {
                item: 'Huevos mezclados',
                required: true,
              },
            ],
          },
          {
            title: 'Amasar la Masa',
            instruction: 'Amasa durante 10 minutos hasta que la masa esté suave y elástica.',
            type: 'text',
            duration: 600,
            tips: ['Usa la palma de tu mano para presionar', 'Si está pegajosa, agrega un poco más de harina'],
          },
          {
            title: 'Descanso',
            instruction: 'Cubre la masa con plástico y deja reposar durante 30 minutos a temperatura ambiente.',
            type: 'text',
            duration: 1800,
            feedback: 'El reposo permite que el gluten se relaje.',
          },
          {
            title: 'Estirar la Masa',
            instruction: 'Usa un rodillo o máquina de pasta para estirar la masa a grosor delgado (1-2 mm).',
            type: 'text',
            duration: 600,
            tips: ['Trabaja por secciones', 'Enharína para evitar que se pegue'],
          },
          {
            title: 'Cortar la Pasta',
            instruction: 'Corta en forma de tallarín o la forma que prefieras.',
            type: 'text',
            duration: 300,
            feedback: '¡Casi listo! Tu pasta casera está lista para cocinar.',
          },
        ],
        tags: ['pasta', 'italiana', 'casera'],
      },
      {
        countryId: italy._id,
        title: 'Control del Calor en la Cocina',
        description: 'Domina la temperatura y el calor para cocinar perfectamente',
        type: 'skill',
        difficulty: 'medium',
        xpReward: 75,
        order: 3,
        level: 2,
        category: 'heat_control',
        requiredNodes: [],
        steps: [
          {
            title: 'Tipos de Fuego',
            instruction: 'Aprende sobre fuego alto, medio y bajo, y cuándo usar cada uno.',
            type: 'text',
            duration: 300,
            tips: [
              'Fuego alto: para sellar carnes, hervir rápido',
              'Fuego medio: para la mayoría de la cocción',
              'Fuego bajo: para guisos y cocciones lentas',
            ],
          },
          {
            title: 'Termómetro de Alimentos',
            instruction: 'Aprende a usar un termómetro para verificar que la carne está cocida correctamente.',
            type: 'text',
            duration: 300,
            tips: [
              'Pollo: 75°C (165°F)',
              'Cerdo: 63°C (145°F)',
              'Carne roja: 63-71°C (145-160°F)',
            ],
          },
        ],
        tips: ['Invierte en un buen termómetro', 'Practica constantemente'],
      },
      {
        countryId: italy._id,
        title: 'Risotto Clásico',
        description: 'Prepara un delicioso risotto a la italiana',
        type: 'recipe',
        difficulty: 'hard',
        xpReward: 150,
        order: 4,
        level: 3,
        category: 'main_course',
        requiredNodes: [],
        servings: 4,
        prepTime: 15,
        cookTime: 25,
        ingredients: [
          {
            name: 'Arroz Arborio',
            quantity: 300,
            unit: 'g',
            optional: false,
          },
          {
            name: 'Caldo de pollo',
            quantity: 1,
            unit: 'litro',
            optional: false,
          },
          {
            name: 'Vino blanco',
            quantity: 150,
            unit: 'ml',
            optional: false,
          },
          {
            name: 'Cebolla',
            quantity: 1,
            unit: 'unidad',
            optional: false,
          },
          {
            name: 'Queso Parmesano',
            quantity: 100,
            unit: 'g',
            optional: false,
          },
        ],
        steps: [
          {
            title: 'Preparación',
            instruction: 'Calienta el caldo en una olla. Pica la cebolla finamente.',
            type: 'text',
            duration: 300,
            checklist: [
              {
                item: 'Caldo caliente',
                required: true,
              },
              {
                item: 'Cebolla picada',
                required: true,
              },
            ],
          },
          {
            title: 'Tostar el Arroz',
            instruction: 'Calienta mantequilla en una olla, sofríe la cebolla, luego agrega el arroz. Tuesta durante 2-3 minutos.',
            type: 'text',
            duration: 300,
            tips: ['Revuelve constantemente', 'El arroz debe verse opaco'],
          },
          {
            title: 'Desglaçar',
            instruction: 'Agrega el vino blanco y revuelve hasta que se haya absorbido completamente.',
            type: 'text',
            duration: 180,
          },
          {
            title: 'Agregar Caldo',
            instruction: 'Agrega caldo caliente poco a poco (1 cucharón a la vez), esperando que el arroz lo absorba antes de agregar más. Continúa durante 18-20 minutos.',
            type: 'text',
            duration: 1200,
            tips: [
              'No te vayas, revuelve frecuentemente',
              'El arroz debe estar cremoso, no seco',
              'Prueba para verificar la textura',
            ],
          },
          {
            title: 'Terminar',
            instruction: 'Retira del fuego, agrega mantequilla y queso Parmesano rallado. Revuelve vigorosamente.',
            type: 'text',
            duration: 300,
            feedback: '¡Perfecto! Tu risotto está listo para servir.',
          },
        ],
        tags: ['risotto', 'italiana', 'arroz'],
      },
    ];

    const createdNodes = await LearningNode.insertMany(nodes);
    console.log(`Created ${createdNodes.length} learning nodes`);

    // Update country with node references
    italy.learningNodes = createdNodes.map((n) => n._id);
    await italy.save();

    console.log('Seed data created successfully!');
    console.log(`Country: ${italy.name}`);
    console.log(`Learning Nodes: ${createdNodes.length}`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedLearningData();
