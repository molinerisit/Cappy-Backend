const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/user.model');
const UserProgress = require('../models/UserProgress.model');

async function syncCompletedLessonsCount() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    const users = await User.find({});
    console.log(`\n📊 Procesando ${users.length} usuarios...\n`);

    for (const user of users) {
      // Buscar todos los UserProgress del usuario
      const progressRecords = await UserProgress.find({ userId: user._id });
      
      // Contar nodos únicos completados en TODOS los paths
      const uniqueNodeIds = new Set();
      progressRecords.forEach(progress => {
        progress.completedNodes.forEach(node => {
          uniqueNodeIds.add(node.nodeId.toString());
        });
      });

      const realCount = uniqueNodeIds.size;
      const currentCount = user.completedLessonsCount || 0;

      // También calcular el XP desde las lecciones completadas
      if (realCount > 0 || user.totalXP > 0) {
        user.completedLessonsCount = realCount;
        
        // Si no cuenta lecciones pero tiene XP, estimar
        if (realCount === 0 && user.totalXP > 0) {
          // Estimar: cada nodo da 50 XP en promedio
          const estimatedLessons = Math.floor(user.totalXP / 50);
          user.completedLessonsCount = estimatedLessons;
          console.log(`⚠️  Usuario ${user.email}: Sin nodos registrados pero tiene ${user.totalXP} XP → Estimado: ${estimatedLessons} lecciones`);
        } else {
          console.log(`✅ Usuario ${user.email}: ${currentCount} → ${realCount} lecciones`);
        }
        
        await user.save();
      } else {
        console.log(`✓ Usuario ${user.email}: 0 lecciones (correcto)`);
      }
    }

    console.log('\n✅ Sincronización completada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

syncCompletedLessonsCount();
