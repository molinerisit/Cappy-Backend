const mongoose = require('mongoose');
const User = require('../models/user.model');
const Country = require('../models/Country.model');
const LearningPath = require('../models/LearningPath.model');
const LearningNode = require('../models/LearningNode.model');
require('dotenv').config();

/**
 * Script de prueba completo del sistema de administración
 * 
 * Este script:
 * 1. Verifica conexión a MongoDB
 * 2. Lista usuarios existentes
 * 3. Lista países disponibles
 * 4. Lista learning paths
 * 5. Lista learning nodes
 * 
 * Usage:
 *   node src/scripts/testAdminSystem.js
 */

async function testAdminSystem() {
  try {
    console.log('🔍 Iniciando pruebas del sistema de administración...\n');

    // 1. Conectar a MongoDB
    console.log('📡 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cooklevel');
    console.log('✅ Conectado a MongoDB\n');

    // 2. Verificar usuarios
    console.log('👥 Verificando usuarios...');
    const users = await User.find().select('email role xp streak');
    console.log(`   Total usuarios: ${users.length}`);
    
    if (users.length > 0) {
      console.log('   Usuarios registrados:');
      users.forEach(user => {
        console.log(`     - ${user.email} (role: ${user.role}, xp: ${user.xp}, streak: ${user.streak})`);
      });
    } else {
      console.log('   ⚠️  No hay usuarios registrados');
    }
    console.log('');

    // 3. Verificar admins
    const admins = users.filter(u => u.role === 'admin');
    console.log('🔐 Administradores:');
    if (admins.length > 0) {
      admins.forEach(admin => {
        console.log(`   ✅ ${admin.email}`);
      });
    } else {
      console.log('   ⚠️  No hay administradores. Necesitas ejecutar promoteToAdmin.js');
    }
    console.log('');

    // 4. Verificar países
    console.log('🌎 Verificando países...');
    const countries = await Country.find().select('name code icon isActive isPremium');
    console.log(`   Total países: ${countries.length}`);
    
    if (countries.length > 0) {
      const activeCountries = countries.filter(c => c.isActive);
      console.log(`   Países activos: ${activeCountries.length}`);
      console.log(`   Primeros 5 países:`);
      countries.slice(0, 5).forEach(country => {
        console.log(`     ${country.icon || '🍽️'} ${country.name} (${country.code}) ${country.isPremium ? '💎' : ''}`);
      });
    } else {
      console.log('   ⚠️  No hay países. Ejecuta: node src/config/seedComplete.js');
    }
    console.log('');

    // 5. Verificar Learning Paths
    console.log('📚 Verificando Learning Paths...');
    const paths = await LearningPath.find()
      .populate('countryId', 'name code')
      .sort({ type: 1, createdAt: -1 });
    
    console.log(`   Total paths: ${paths.length}`);
    
    if (paths.length > 0) {
      console.log('   Paths por tipo:');
      const byType = {
        country_recipe: paths.filter(p => p.type === 'country_recipe').length,
        country_culture: paths.filter(p => p.type === 'country_culture').length,
        goal: paths.filter(p => p.type === 'goal').length
      };
      console.log(`     - country_recipe: ${byType.country_recipe}`);
      console.log(`     - country_culture: ${byType.country_culture}`);
      console.log(`     - goal: ${byType.goal}`);
      
      console.log(`\n   Primeros 5 paths:`);
      paths.slice(0, 5).forEach(path => {
        const country = path.countryId ? ` (${path.countryId.name})` : '';
        const goal = path.goalType ? ` (${path.goalType})` : '';
        console.log(`     ${path.icon} ${path.title} [${path.type}]${country}${goal} - ${path.nodes.length} nodos`);
      });
    } else {
      console.log('   ℹ️  No hay paths creados. Puedes crearlos desde el panel de admin.');
    }
    console.log('');

    // 6. Verificar Learning Nodes
    console.log('📖 Verificando Learning Nodes...');
    const nodes = await LearningNode.find()
      .populate('pathId', 'title type')
      .sort({ createdAt: -1 });
    
    console.log(`   Total nodos: ${nodes.length}`);
    
    if (nodes.length > 0) {
      console.log('   Nodos por tipo:');
      const byType = {
        recipe: nodes.filter(n => n.type === 'recipe').length,
        skill: nodes.filter(n => n.type === 'skill').length,
        quiz: nodes.filter(n => n.type === 'quiz').length
      };
      console.log(`     - recipe: ${byType.recipe}`);
      console.log(`     - skill: ${byType.skill}`);
      console.log(`     - quiz: ${byType.quiz}`);
      
      console.log(`\n   Primeros 5 nodos:`);
      nodes.slice(0, 5).forEach(node => {
        const pathName = node.pathId ? node.pathId.title : 'Sin path';
        const emoji = node.type === 'recipe' ? '🍳' : node.type === 'skill' ? '💪' : '❓';
        console.log(`     ${emoji} ${node.title} [${node.type}, ${node.difficulty}] - ${node.xpReward}XP (Path: ${pathName})`);
      });
    } else {
      console.log('   ℹ️  No hay nodos creados. Puedes crearlos desde el panel de admin.');
    }
    console.log('');

    // 7. Verificar integridad de relaciones
    console.log('🔗 Verificando integridad de relaciones...');
    
    // Paths sin nodos
    const pathsWithoutNodes = paths.filter(p => p.nodes.length === 0);
    if (pathsWithoutNodes.length > 0) {
      console.log(`   ⚠️  ${pathsWithoutNodes.length} path(s) sin nodos:`);
      pathsWithoutNodes.slice(0, 3).forEach(p => {
        console.log(`     - ${p.title} (${p.type})`);
      });
    } else {
      console.log('   ✅ Todos los paths tienen nodos');
    }
    
    // Nodos sin path válido
    const nodesWithInvalidPath = nodes.filter(n => !n.pathId);
    if (nodesWithInvalidPath.length > 0) {
      console.log(`   ⚠️  ${nodesWithInvalidPath.length} nodo(s) sin path válido`);
    } else {
      console.log('   ✅ Todos los nodos tienen path válido');
    }
    console.log('');

    // 8. Resumen y recomendaciones
    console.log('📊 RESUMEN DEL SISTEMA\n');
    console.log('=' .repeat(60));
    console.log(`✅ MongoDB conectado`);
    console.log(`${users.length > 0 ? '✅' : '❌'} Usuarios: ${users.length}`);
    console.log(`${admins.length > 0 ? '✅' : '⚠️'} Administradores: ${admins.length}`);
    console.log(`${countries.length > 0 ? '✅' : '⚠️'} Países: ${countries.length}`);
    console.log(`${paths.length > 0 ? '✅' : 'ℹ️'} Learning Paths: ${paths.length}`);
    console.log(`${nodes.length > 0 ? '✅' : 'ℹ️'} Learning Nodes: ${nodes.length}`);
    console.log('=' .repeat(60));
    console.log('');

    // Recomendaciones
    console.log('💡 RECOMENDACIONES:\n');
    
    if (users.length === 0) {
      console.log('1. 📝 Registra un usuario desde la app o con cURL:');
      console.log('   curl -X POST http://localhost:5000/api/auth/register \\');
      console.log('     -H "Content-Type: application/json" \\');
      console.log('     -d \'{"email":"admin@cooklevel.com","password":"admin123"}\'');
      console.log('');
    }
    
    if (admins.length === 0 && users.length > 0) {
      console.log('2. 🔐 Promueve un usuario a admin:');
      console.log(`   node src/scripts/promoteToAdmin.js ${users[0].email}`);
      console.log('');
    }
    
    if (countries.length === 0) {
      console.log('3. 🌎 Ejecuta el seed de países:');
      console.log('   node src/config/seedComplete.js');
      console.log('');
    }
    
    if (admins.length > 0) {
      console.log('✅ Ya puedes usar el panel de admin en la app:');
      console.log('   1. Inicia sesión con tu email de admin');
      console.log('   2. Ve a Perfil > Panel admin');
      console.log('   3. Crea Learning Paths y Learning Nodes');
      console.log('');
    }

    console.log('🎉 Pruebas completadas!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testAdminSystem();
