const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/user.model');
const UserProgress = require('../models/UserProgress.model');

async function debugUserData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Buscar usuario con XP
    const users = await User.find({ totalXP: { $gt: 0 } });
    console.log(`👤 Usuarios con XP > 0: ${users.length}\n`);

    for (const user of users) {
      console.log(`\n========== Usuario: ${user.email} ==========`);
      console.log(`totalXP: ${user.totalXP}`);
      console.log(`level: ${user.level}`);
      console.log(`completedLessonsCount: ${user.completedLessonsCount}`);
      console.log(`ID: ${user._id}`);

      // Buscar su progreso
      const progressRecords = await UserProgress.find({ userId: user._id });
      console.log(`\n📊 Registros de progreso: ${progressRecords.length}`);

      progressRecords.forEach((progress, index) => {
        console.log(`\n--- Registro #${index + 1} ---`);
        console.log(`pathId: ${progress.pathId}`);
        console.log(`trackId: ${progress.trackId}`);
        console.log(`completedNodes: ${progress.completedNodes.length}`);
        console.log(`xp: ${progress.xp}`);
        console.log(`level: ${progress.level}`);
        
        if (progress.completedNodes.length > 0) {
          console.log(`\nNodos completados:`);
          progress.completedNodes.forEach(node => {
            console.log(`  - ${node.nodeId} (attempts: ${node.attempts}, score: ${node.score})`);
          });
        }
      });
    }

    console.log('\n✅ Debug completado');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugUserData();
