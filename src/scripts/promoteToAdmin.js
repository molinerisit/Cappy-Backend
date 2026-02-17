const mongoose = require('mongoose');
const User = require('../models/user.model');
require('dotenv').config();

/**
 * Script to promote a user to admin role
 * 
 * Usage:
 *   node src/scripts/promoteToAdmin.js <email>
 * 
 * Example:
 *   node src/scripts/promoteToAdmin.js admin@cooklevel.com
 */

async function promoteToAdmin(email) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cooklevel');
    console.log('✅ Connected to MongoDB');

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      console.log('\n💡 Tip: Make sure you registered first!');
      process.exit(1);
    }

    // Check if already admin
    if (user.role === 'admin') {
      console.log(`ℹ️  User ${email} is already an admin`);
      process.exit(0);
    }

    // Promote to admin
    user.role = 'admin';
    await user.save();

    console.log(`✅ SUCCESS! User ${email} promoted to admin`);
    console.log(`\n📋 User details:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   XP: ${user.xp}`);
    console.log(`   Streak: ${user.streak}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Error: Email is required');
  console.log('\nUsage: node src/scripts/promoteToAdmin.js <email>');
  console.log('Example: node src/scripts/promoteToAdmin.js admin@cooklevel.com');
  process.exit(1);
}

promoteToAdmin(email);
