#!/usr/bin/env node

/**
 * 🔐 Script de Generación de Secretos Seguros
 * Genera credenciales criptográficamente seguras para variables de entorno
 * 
 * Uso: node src/scripts/generateSecrets.js
 * 
 * ⚠️  IMPORTANTE:
 * - Guardar el JWT_SECRET generado en .env (NO en git)
 * - NO compartir estos secretos
 * - Si fue expuesto, regenerar y rotacionar todas las sesiones
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecretGenerator {
  /**
   * Genera un JWT_SECRET criptográficamente seguro
   * @param {number} bytes - Número de bytes (default: 32 = 256 bits)
   * @returns {string} Hexadecimal string seguro
   */
  static generateJWTSecret(bytes = 32) {
    const secret = crypto.randomBytes(bytes).toString('hex');
    return secret;
  }

  /**
   * Genera una contraseña temporal fuerte para admin
   * @returns {string} Contraseña aleatoria de 24 caracteres
   */
  static generateAdminPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 24; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Genera Mongo URI con credenciales seguras
   * @returns {object} Con usuario y contraseña aleatorios
   */
  static generateMongoCredentials() {
    const username = `admin_${crypto.randomBytes(4).toString('hex')}`;
    const password = crypto.randomBytes(20).toString('hex');
    return { username, password };
  }

  /**
   * Crear/actualizar archivo .env
   */
  static createEnvFile() {
    const jwtSecret = this.generateJWTSecret();
    const { username, password } = this.generateMongoCredentials();
    const adminPassword = this.generateAdminPassword();

    const envContent = `# 🔐 COOKLEVEL ENVIRONMENT VARIABLES
# Generado automáticamente - MANTENER SEGURO
# Última actualización: ${new Date().toISOString()}

# === SERVIDOR ===
PORT=3000
NODE_ENV=development

# === JWT Autenticación ===
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=7d

# === MONGODB ===
# Conexión local (desarrollo)
MONGO_URI=mongodb://localhost:27017/cooklevel

# Conexión producción (descomentar y llenar)
# MONGO_URI=mongodb+srv://${username}:${password}@cluster.mongodb.net/cooklevel

# === CLOUDINARY (Imágenes CDN) ===
# Descargar credenciales de: https://cloudinary.com/console
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# === ADMIN INICIAL ===
# Contraseña temporal para primer login (CAMBIAR DESPUÉS)
ADMIN_EMAIL=admin@cooklevel.app
ADMIN_TEMP_PASSWORD=${adminPassword}

# === REDIS (Rate Limiting) ===
REDIS_HOST=localhost
REDIS_PORT=6379

# === LOGS ===
LOG_LEVEL=debug
LOG_FILE=./logs/cooklevel.log

# === SEGURIDAD ===
# Base URL para tokens de email
BASE_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:8080,http://localhost:3000

# IMPORTANTE: Nunca commitear este archivo
# Este archivo está en .gitignore
`;

    const envPath = path.join(__dirname, '../../.env');
    fs.writeFileSync(envPath, envContent);

    return {
      success: true,
      path: envPath,
      secrets: {
        JWT_SECRET: jwtSecret,
        ADMIN_TEMP_PASSWORD: adminPassword,
        MONGO_USERNAME: username,
        MONGO_PASSWORD: password
      }
    };
  }

  /**
   * Mostrar output configurado
   */
  static printOutput(result) {
    console.log('\n' + '='.repeat(70));
    console.log('🔐 GENERADOR DE SECRETOS - COOKLEVEL');
    console.log('='.repeat(70) + '\n');

    if (result.success) {
      console.log('✅ Archivo .env creado exitosamente\n');

      console.log('📄 Ubicación:', result.path);
      console.log('\n🔑 CREDENCIALES GENERADAS:\n');

      console.log('├─ JWT_SECRET (32 bytes hex):');
      console.log(`│  ${result.secrets.JWT_SECRET}\n`);

      console.log('├─ Admin Temporal Password:');
      console.log(`│  ${result.secrets.ADMIN_TEMP_PASSWORD}\n`);

      console.log('├─ MongoDB Username:');
      console.log(`│  ${result.secrets.MONGO_USERNAME}\n`);

      console.log('├─ MongoDB Password:');
      console.log(`│  ${result.secrets.MONGO_PASSWORD}\n`);

      console.log('⚠️  ACCIONES REQUERIDAS:\n');
      console.log('1. Guardar estas credenciales en gestor de contraseñas seguro');
      console.log('2. Cambiar admin password en primer login');
      console.log('3. Si va a producción: configurar MongoDB Atlas y actualizar MONGO_URI');
      console.log('4. Configurar Cloudinary: https://cloudinary.com/console\n');

      console.log('🚨 NUNCA COMPARTIR O COMMITEAR ESTOS SECRETOS\n');
    } else {
      console.error('❌ Error generando secretos');
    }

    console.log('='.repeat(70) + '\n');
  }
}

// Ejecutar script
if (require.main === module) {
  try {
    const result = SecretGenerator.createEnvFile();
    SecretGenerator.printOutput(result);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = SecretGenerator;
