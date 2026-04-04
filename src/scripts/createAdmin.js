/**
 * Script: createAdmin.js
 * Crea o actualiza el usuario administrador del sistema.
 * Uso: node src/scripts/createAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('../config/db');
const User = require('../models/user.model');

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@cooklevel.app';
const ADMIN_PASSWORD = process.argv[2] || process.env.ADMIN_TEMP_PASSWORD;

if (!ADMIN_PASSWORD) {
  console.error('❌ Debes proveer una contraseña como argumento: node src/scripts/createAdmin.js <password>');
  process.exit(1);
}

async function createAdmin() {
  await connectDB();

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const existing = await User.findOne({ email: ADMIN_EMAIL });

  if (existing) {
    existing.password = hashedPassword;
    existing.role = 'admin';
    existing.forcePasswordChange = false;
    existing.isTempPassword = false;
    existing.passwordChangedAt = new Date();
    await existing.save();
    console.log(`✅ Admin actualizado: ${ADMIN_EMAIL}`);
  } else {
    await User.create({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      username: 'Admin',
      role: 'admin',
      forcePasswordChange: false,
      isTempPassword: false,
      passwordChangedAt: new Date(),
    });
    console.log(`✅ Admin creado: ${ADMIN_EMAIL}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
