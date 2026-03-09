const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const User = require("../src/models/user.model");

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/cooklevel");

/**
 * 🔐 Crear o actualizar usuario Admin con contraseña definida
 * 
 * La contraseña:
 * - Se recibe por variable de entorno ADMIN_TEMP_PASSWORD
 * - No requiere cambio forzado en primer login
 * - Se hashea con 12 rounds de bcrypt
 */
async function createAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@cooklevel.com";
      const tempPassword = process.env.ADMIN_TEMP_PASSWORD;

      if (!tempPassword) {
        console.error("❌ Falta ADMIN_TEMP_PASSWORD en variables de entorno");
        console.error("Ejemplo PowerShell: $env:ADMIN_TEMP_PASSWORD='@MyDream+1'; node seed/createAdmin.js");
        process.exit(1);
      }
    
    // 1️⃣ Buscar usuario admin existente
    const existing = await User.findOne({ email: adminEmail });

    // 2️⃣ Hash con 12 rounds (seguridad mejorada)
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // 3️⃣ Si existe, actualizar password y mantener acceso normal
    if (existing) {
      existing.password = hashedPassword;
      existing.role = "admin";
      existing.forcePasswordChange = false;
      existing.isTempPassword = false;
      existing.passwordChangedAt = new Date();
      existing.verified = true;
      await existing.save();

      console.log(`✅ Admin usuario actualizado correctamente: ${existing._id}`);
      console.log(`Email: ${adminEmail}`);
      console.log(`Contraseña: ${tempPassword}`);
      console.log('✅ No requiere cambio en primer login\n');
      process.exit(0);
    }

    // 4️⃣ Si no existe, crear admin con contraseña solicitada
    console.log('\n' + '='.repeat(70));
    console.log('🔐 GENERANDO ADMIN CON CONTRASEÑA DEFINIDA');
    console.log('='.repeat(70));
    console.log(`Email: ${adminEmail}`);
    console.log(`Contraseña: ${tempPassword}`);
    console.log('✅ No requiere cambio en primer login\n');

    // 5️⃣ Crear usuario Admin con flags de seguridad
    const admin = await User.create({
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      forcePasswordChange: false,
      isTempPassword: false,
      passwordChangedAt: new Date(),
      verified: true,                  // Admin creado como verificado
    });

    console.log(`✅ Admin usuario creado correctamente: ${admin._id}`);
    console.log('='.repeat(70) + '\n');

    // 6️⃣ Guardar credenciales en archivo temporario (solo en desarrollo)
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'staging') {
      const credentialsPath = path.join(process.cwd(), '.admin-credentials.txt');
      const credentials = `🔐 ADMIN CREDENTIALS\n=====================================\nEmail: ${adminEmail}\nPassword: ${tempPassword}\nGenerated: ${new Date().toISOString()}\n\n⚠️  IMPORTANTE:\n- Eliminar este archivo después\n- NUNCA commitear a git\n`;
      
      fs.writeFileSync(credentialsPath, credentials);
      console.log(`💾 Credenciales guardadas en: .admin-credentials.txt`);
      console.log(`⚠️  Archivo será válido solo en esta sesión\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando admin:', error.message);
    process.exit(1);
  }
}

createAdmin();
