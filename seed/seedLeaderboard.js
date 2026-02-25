const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../src/models/user.model');

const seedLeaderboardUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cooklevel');
    console.log('MongoDB connected for seeding');

    // Create some test users with different XP levels
    const testUsers = [
      { email: 'chef1@test.com', password: 'password123', username: 'Chef Master', totalXP: 15000, level: 50, streak: 100 },
      { email: 'chef2@test.com', password: 'password123', username: 'Culinary Pro', totalXP: 12500, level: 42, streak: 85 },
      { email: 'chef3@test.com', password: 'password123', username: 'Pasta King', totalXP: 10000, level: 35, streak: 70 },
      { email: 'chef4@test.com', password: 'password123', username: 'Sushi Expert', totalXP: 9500, level: 33, streak: 65 },
      { email: 'chef5@test.com', password: 'password123', username: 'Taco Legend', totalXP: 8800, level: 31, streak: 60 },
      { email: 'chef6@test.com', password: 'password123', username: 'Pizza Maestro', totalXP: 8200, level: 29, streak: 55 },
      { email: 'chef7@test.com', password: 'password123', username: 'BBQ Boss', totalXP: 7500, level: 27, streak: 50 },
      { email: 'chef8@test.com', password: 'password123', username: 'Curry Master', totalXP: 7000, level: 25, streak: 45 },
      { email: 'chef9@test.com', password: 'password123', username: 'Ramen Hero', totalXP: 6500, level: 23, streak: 40 },
      { email: 'chef10@test.com', password: 'password123', username: 'Burger King', totalXP: 6000, level: 21, streak: 35 },
      { email: 'chef11@test.com', password: 'password123', username: 'Salad Guru', totalXP: 5500, level: 20, streak: 30 },
      { email: 'chef12@test.com', password: 'password123', username: 'Dessert Queen', totalXP: 5200, level: 19, streak: 28 },
      { email: 'chef13@test.com', password: 'password123', username: 'Soup Specialist', totalXP: 4800, level: 18, streak: 25 },
      { email: 'chef14@test.com', password: 'password123', username: 'Bread Baker', totalXP: 4500, level: 17, streak: 22 },
      { email: 'chef15@test.com', password: 'password123', username: 'Steak Expert', totalXP: 4200, level: 16, streak: 20 },
      { email: 'chef16@test.com', password: 'password123', username: 'Vegan Chef', totalXP: 3800, level: 15, streak: 18 },
      { email: 'chef17@test.com', password: 'password123', username: 'Seafood Pro', totalXP: 3500, level: 14, streak: 16 },
      { email: 'chef18@test.com', password: 'password123', username: 'Rice Master', totalXP: 3200, level: 13, streak: 14 },
      { email: 'chef19@test.com', password: 'password123', username: 'Noodle Ninja', totalXP: 2900, level: 12, streak: 12 },
      { email: 'chef20@test.com', password: 'password123', username: 'Sauce Wizard', totalXP: 2600, level: 11, streak: 10 },
      { email: 'chef21@test.com', password: 'password123', username: 'Grill Master', totalXP: 2300, level: 10, streak: 9 },
      { email: 'chef22@test.com', password: 'password123', username: 'Wok Expert', totalXP: 2000, level: 9, streak: 8 },
      { email: 'chef23@test.com', password: 'password123', username: 'Spice Guru', totalXP: 1700, level: 8, streak: 7 },
      { email: 'chef24@test.com', password: 'password123', username: 'Fusion Chef', totalXP: 1400, level: 7, streak: 6 },
      { email: 'chef25@test.com', password: 'password123', username: 'Street Food', totalXP: 1200, level: 6, streak: 5 },
      { email: 'chef26@test.com', password: 'password123', username: 'Home Cook', totalXP: 1000, level: 5, streak: 4 },
      { email: 'chef27@test.com', password: 'password123', username: 'Rookie Chef', totalXP: 800, level: 4, streak: 3 },
      { email: 'chef28@test.com', password: 'password123', username: 'Apprentice', totalXP: 600, level: 3, streak: 2 },
      { email: 'chef29@test.com', password: 'password123', username: 'Beginner', totalXP: 400, level: 2, streak: 1 },
      { email: 'chef30@test.com', password: 'password123', username: 'Novice', totalXP: 200, level: 1, streak: 0 },
    ];

    // Check if users already exist
    const existingCount = await User.countDocuments({ email: { $in: testUsers.map(u => u.email) } });
    
    if (existingCount === 0) {
      await User.insertMany(testUsers);
      console.log('✅ 30 leaderboard test users created successfully');
    } else {
      console.log('⚠️  Test users already exist');
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error seeding leaderboard users:', error);
    process.exit(1);
  }
};

seedLeaderboardUsers();
