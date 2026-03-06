const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User.model');
const LearningPath = require('../src/models/LearningPath.model');
const LearningNode = require('../src/models/LearningNode.model');
const UserProgress = require('../src/models/UserProgress.model');

async function completeInitialLessons() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cooklevel';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Buscar el admin
    const admin = await User.findOne({ email: 'admin@cooklevel.com' });
    if (!admin) {
      console.log('Admin no encontrado');
      process.exit(1);
    }

    // Buscar el path de Aprender a Cocinar
    const cookingPath = await LearningPath.findOne({ goalType: 'cooking_school' });
    if (!cookingPath) {
      console.log('Path no encontrado');
      process.exit(1);
    }

    // Obtener los primeros 3 nodos del path (nivel 1)
    const nodesToComplete = await LearningNode.find({
      pathId: cookingPath._id,
      level: 1,
      isDeleted: { $ne: true }
    })
      .sort({ positionIndex: 1, order: 1 })
      .limit(3)
      .select('_id title xpReward')
      .lean();

    if (nodesToComplete.length === 0) {
      console.log('No hay nodos para completar');
      process.exit(0);
    }

    console.log(`Completando ${nodesToComplete.length} lecciones para admin...`);

    // Buscar o crear el UserProgress
    let userProgress = await UserProgress.findOne({
      userId: admin._id,
      pathId: cookingPath._id
    });

    if (!userProgress) {
      // Obtener todos los nodos del path
      const allNodes = await LearningNode.find({
        pathId: cookingPath._id,
        isDeleted: { $ne: true }
      }).select('_id').lean();

      userProgress = new UserProgress({
        userId: admin._id,
        pathId: cookingPath._id,
        unlockedLessons: [nodesToComplete[0]._id], // Desbloquear el primero
        completedLessons: [],
        totalXpEarned: 0
      });
    }

    // Completar los nodos y desbloquear los siguientes
    let totalXp = userProgress.totalXpEarned || 0;
    const completedIds = new Set(userProgress.completedLessons.map(id => id.toString()));
    const unlockedIds = new Set(userProgress.unlockedLessons.map(id => id.toString()));

    // Obtener TODOS los nodos del path ordenados
    const allPathNodes = await LearningNode.find({
      pathId: cookingPath._id,
      isDeleted: { $ne: true }
    })
      .sort({ level: 1, positionIndex: 1, order: 1 })
      .select('_id')
      .lean();

    for (let i = 0; i < nodesToComplete.length; i++) {
      const node = nodesToComplete[i];
      const nodeIdStr = node._id.toString();

      if (!completedIds.has(nodeIdStr)) {
        completedIds.add(nodeIdStr);
        totalXp += node.xpReward;
        console.log(`✓ Completado: ${node.title} (+${node.xpReward} XP)`);

        // Desbloquear el siguiente nodo
        const currentIndex = allPathNodes.findIndex(n => n._id.toString() === nodeIdStr);
        if (currentIndex >= 0 && currentIndex + 1 < allPathNodes.length) {
          const nextNodeId = allPathNodes[currentIndex + 1]._id.toString();
          if (!unlockedIds.has(nextNodeId)) {
            unlockedIds.add(nextNodeId);
            console.log(`  → Desbloqueado siguiente nodo`);
          }
        }
      }
    }

    // Actualizar el UserProgress
    userProgress.completedLessons = Array.from(completedIds);
    userProgress.unlockedLessons = Array.from(unlockedIds);
    userProgress.totalXpEarned = totalXp;
    await userProgress.save();

    // Actualizar el XP total del usuario
    admin.totalXP = (admin.totalXP || 0) + totalXp;
    admin.level = Math.floor(admin.totalXP / 100) + 1;
    await admin.save();

    console.log(`\n✅ Completado exitosamente`);
    console.log(`   - Lecciones completadas: ${completedIds.size}`);
    console.log(`   - Lecciones desbloqueadas: ${unlockedIds.size}`);
    console.log(`   - XP total ganado: ${totalXp}`);
    console.log(`   - Nivel del usuario: ${admin.level}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

completeInitialLessons();
