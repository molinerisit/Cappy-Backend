/**
 * Script para crear índices de MongoDB
 * 
 * Ejecutar: node src/scripts/createIndexes.js
 * 
 * Este script crea todos los índices necesarios para optimizar
 * el rendimiento de las consultas en la base de datos.
 */

const mongoose = require('mongoose');
const NodeGroup = require('../models/NodeGroup.model');
const NodeStep = require('../models/NodeStep.model');
const NodeCard = require('../models/NodeCard.model');
const LearningNode = require('../models/LearningNode.model');
const LearningPath = require('../models/LearningPath.model');

require('dotenv').config();

async function createIndexes() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cooklevel');
    console.log('✅ Conectado a MongoDB\n');

    console.log('📊 Creando índices...\n');

    // ===================================================
    // NodeGroup Indexes
    // ===================================================
    console.log('🟢 NodeGroup indexes...');
    await NodeGroup.collection.createIndex({ pathId: 1, order: 1 });
    await NodeGroup.collection.createIndex({ pathId: 1, isDeleted: 1 });
    console.log('  ✓ pathId + order');
    console.log('  ✓ pathId + isDeleted\n');

    // ===================================================
    // NodeStep Indexes
    // ===================================================
    console.log('🟡 NodeStep indexes...');
    await NodeStep.collection.createIndex({ nodeId: 1, order: 1 });
    await NodeStep.collection.createIndex({ nodeId: 1, isDeleted: 1 });
    console.log('  ✓ nodeId + order');
    console.log('  ✓ nodeId + isDeleted\n');

    // ===================================================
    // NodeCard Indexes
    // ===================================================
    console.log('🟣 NodeCard indexes...');
    await NodeCard.collection.createIndex({ stepId: 1, order: 1 });
    await NodeCard.collection.createIndex({ stepId: 1, isDeleted: 1 });
    await NodeCard.collection.createIndex({ type: 1 });
    console.log('  ✓ stepId + order');
    console.log('  ✓ stepId + isDeleted');
    console.log('  ✓ type\n');

    // ===================================================
    // LearningNode Indexes
    // ===================================================
    console.log('🔵 LearningNode indexes...');
    await LearningNode.collection.createIndex({ pathId: 1, isDeleted: 1 });
    await LearningNode.collection.createIndex({ pathId: 1, level: 1, positionIndex: 1 });
    await LearningNode.collection.createIndex({ groupId: 1, isDeleted: 1 });
    await LearningNode.collection.createIndex({ originalNodeId: 1 });
    await LearningNode.collection.createIndex({ type: 1, status: 1 });
    await LearningNode.collection.createIndex({ isLinked: 1, isDeleted: 1 });
    await LearningNode.collection.createIndex({ title: 'text', description: 'text', tags: 'text' });
    console.log('  ✓ pathId + isDeleted');
    console.log('  ✓ pathId + level + positionIndex (para niveles paralelos)');
    console.log('  ✓ groupId + isDeleted');
    console.log('  ✓ originalNodeId (para linked nodes)');
    console.log('  ✓ type + status');
    console.log('  ✓ isLinked + isDeleted');
    console.log('  ✓ text indexes (title, description, tags)\n');

    // ===================================================
    // LearningPath Indexes
    // ===================================================
    console.log('🔷 LearningPath indexes...');
    await LearningPath.collection.createIndex({ type: 1, countryId: 1 });
    await LearningPath.collection.createIndex({ isActive: 1, isDeleted: 1 });
    await LearningPath.collection.createIndex({ title: 'text', description: 'text' });
    console.log('  ✓ type + countryId');
    console.log('  ✓ isActive + isDeleted');
    console.log('  ✓ text indexes (title, description)\n');

    console.log('✅ Todos los índices creados exitosamente\n');

    // Mostrar estadísticas
    console.log('📈 Estadísticas de índices:\n');
    
    const nodeGroupIndexes = await NodeGroup.collection.getIndexes();
    console.log(`NodeGroup: ${Object.keys(nodeGroupIndexes).length} índices`);
    
    const nodeStepIndexes = await NodeStep.collection.getIndexes();
    console.log(`NodeStep: ${Object.keys(nodeStepIndexes).length} índices`);
    
    const nodeCardIndexes = await NodeCard.collection.getIndexes();
    console.log(`NodeCard: ${Object.keys(nodeCardIndexes).length} índices`);
    
    const learningNodeIndexes = await LearningNode.collection.getIndexes();
    console.log(`LearningNode: ${Object.keys(learningNodeIndexes).length} índices`);
    
    const learningPathIndexes = await LearningPath.collection.getIndexes();
    console.log(`LearningPath: ${Object.keys(learningPathIndexes).length} índices`);

    console.log('\n🎉 ¡Script completado!\n');

  } catch (error) {
    console.error('❌ Error creando índices:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Conexión cerrada');
    process.exit(0);
  }
}

// Ejecutar
createIndexes();
