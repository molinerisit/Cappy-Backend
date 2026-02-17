const Skill = require("../models/Skill.model");
const Country = require("../models/Country.model");
const UserProgress = require("../models/UserProgress.model");

// ==============================
// GET SKILL TREE BY COUNTRY
// ==============================
exports.getSkillTree = async (req, res) => {
  try {
    const { countryId } = req.params;

    const country = await Country.findById(countryId).populate('skills');
    if (!country) {
      return res.status(404).json({ message: "País no encontrado" });
    }

    // Organize skills by level for tree visualization
    const skills = country.skills || [];
    const tree = {
      level1: skills.filter(s => s.level === 1),
      level2: skills.filter(s => s.level === 2),
      level3: skills.filter(s => s.level === 3),
      other: skills.filter(s => s.level > 3 || s.level < 1)
    };

    res.json(tree);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// GET SINGLE SKILL WITH DETAILS
// ==============================
exports.getSkill = async (req, res) => {
  try {
    const { skillId } = req.params;

    const skill = await Skill.findById(skillId)
      .populate('prerequisites')
      .populate('unlocksRecipes')
      .populate('unlocksSkills');

    if (!skill) {
      return res.status(404).json({ message: "Habilidad no encontrada" });
    }

    res.json(skill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// CHECK SKILL UNLOCK STATUS
// ==============================
exports.checkSkillUnlock = async (req, res) => {
  try {
    const { skillId } = req.params;
    const userId = req.user.id;

    const skill = await Skill.findById(skillId).populate('prerequisites');
    if (!skill) {
      return res.status(404).json({ message: "Habilidad no encontrada" });
    }

    const userProgress = await UserProgress.findOne({ userId });
    if (!userProgress) {
      return res.status(404).json({ message: "Progreso no encontrado" });
    }

    // Check if user has learned all prerequisites
    const learnedSkillIds = userProgress.learnedSkills.map(s => s.skillId.toString());
    const prerequisiteMet = skill.prerequisites.every(prereq => 
      learnedSkillIds.includes(prereq._id.toString())
    );

    const isLearned = learnedSkillIds.includes(skillId);
    const missingPrerequisites = skill.prerequisites.filter(p => 
      !learnedSkillIds.includes(p._id.toString())
    );

    res.json({
      isLearned,
      prerequisiteMet,
      missingPrerequisites,
      canLearn: prerequisiteMet && !isLearned
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// LEARN SKILL (Complete all steps)
// ==============================
exports.learnSkill = async (req, res) => {
  try {
    const { skillId } = req.body;
    const userId = req.user.id;

    const skill = await Skill.findById(skillId);
    if (!skill) {
      return res.status(404).json({ message: "Habilidad no encontrada" });
    }

    let userProgress = await UserProgress.findOne({ userId });
    if (!userProgress) {
      userProgress = new UserProgress({ userId, xp: 0, level: 1 });
    }

    // Check if already learned
    const alreadyLearned = userProgress.learnedSkills.find(s => 
      s.skillId.toString() === skillId
    );

    if (!alreadyLearned) {
      userProgress.learnedSkills.push({
        skillId,
        completedAt: new Date(),
        progress: 100
      });

      // Award XP
      userProgress.xp += skill.xpReward;
      userProgress.lastCompletedAt = new Date();
    }

    // Check level up
    const newLevel = Math.floor(userProgress.xp / 100) + 1;
    if (newLevel > userProgress.level) {
      userProgress.level = newLevel;
    }

    await userProgress.save();

    res.json({
      message: "Habilidad aprendida",
      xpEarned: skill.xpReward,
      totalXp: userProgress.xp,
      level: userProgress.level
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// UPDATE SKILL PROGRESS
// ==============================
exports.updateSkillProgress = async (req, res) => {
  try {
    const { skillId } = req.params;
    const { progress } = req.body; // 0-100
    const userId = req.user.id;

    if (progress < 0 || progress > 100) {
      return res.status(400).json({ message: "Progreso debe estar entre 0 y 100" });
    }

    let userProgress = await UserProgress.findOne({ userId });
    if (!userProgress) {
      userProgress = new UserProgress({ userId, xp: 0, level: 1 });
    }

    let skillProgress = userProgress.learnedSkills.find(s => 
      s.skillId.toString() === skillId
    );

    if (!skillProgress) {
      userProgress.learnedSkills.push({
        skillId,
        progress,
        completedAt: progress === 100 ? new Date() : null
      });
    } else {
      skillProgress.progress = progress;
      if (progress === 100 && !skillProgress.completedAt) {
        skillProgress.completedAt = new Date();
      }
    }

    await userProgress.save();

    res.json({
      message: "Progreso actualizado",
      progress
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// CREATE SKILL (Admin)
// ==============================
exports.createSkill = async (req, res) => {
  try {
    const {
      countryId,
      name,
      description,
      category,
      level,
      order,
      xpReward,
      prerequisites,
      unlocksRecipes,
      unlocksSkills,
      steps,
      tips,
      isPremium
    } = req.body;

    if (!countryId || !name || !category) {
      return res.status(400).json({ 
        message: "countryId, name, y category son obligatorios" 
      });
    }

    if (!['knife_skills', 'heat_control', 'seasoning', 'technique', 'preparation'].includes(category)) {
      return res.status(400).json({ 
        message: "category debe ser one of: knife_skills, heat_control, seasoning, technique, preparation" 
      });
    }

    const country = await Country.findById(countryId);
    if (!country) {
      return res.status(404).json({ message: "País no encontrado" });
    }

    const skill = await Skill.create({
      countryId,
      name,
      description,
      category,
      level: level || 1,
      order: order || 0,
      xpReward: xpReward || 30,
      prerequisites: prerequisites || [],
      unlocksRecipes: unlocksRecipes || [],
      unlocksSkills: unlocksSkills || [],
      steps: steps || [],
      tips: tips || [],
      isPremium: isPremium || false
    });

    // Add skill to country
    if (!country.skills.includes(skill._id)) {
      country.skills.push(skill._id);
      await country.save();
    }

    res.status(201).json(skill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// UPDATE SKILL (Admin)
// ==============================
exports.updateSkill = async (req, res) => {
  try {
    const { skillId } = req.params;
    const updates = req.body;

    const skill = await Skill.findByIdAndUpdate(skillId, updates, {
      new: true,
      runValidators: true
    });

    if (!skill) {
      return res.status(404).json({ message: "Habilidad no encontrada" });
    }

    res.json(skill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==============================
// DELETE SKILL (Admin)
// ==============================
exports.deleteSkill = async (req, res) => {
  try {
    const { skillId } = req.params;

    const skill = await Skill.findByIdAndDelete(skillId);
    if (!skill) {
      return res.status(404).json({ message: "Habilidad no encontrada" });
    }

    // Remove from country
    await Country.findByIdAndUpdate(
      skill.countryId,
      { $pull: { skills: skillId } }
    );

    res.json({ message: "Habilidad eliminada" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
