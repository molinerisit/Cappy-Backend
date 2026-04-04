const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────
// CONNECTION POOL — Tuning para alta concurrencia
//
// Con 100k usuarios activos y serverless/multi-instancia:
// - maxPoolSize: 20 conexiones por proceso (ajustar según RAM)
// - minPoolSize: 5 conexiones siempre listas (reduce cold start)
// - maxIdleTimeMS: cierra conexiones ociosas > 30s
// - serverSelectionTimeoutMS: cuánto esperar para encontrar un server
// - connectTimeoutMS: cuánto esperar para establecer conexión TCP
// - socketTimeoutMS: cuánto esperar por respuesta en operación activa
// - heartbeatFrequencyMS: frecuencia de health-check al cluster
// ─────────────────────────────────────────────────────────────
const MONGOOSE_OPTIONS = {
  maxPoolSize:              20,
  minPoolSize:               5,
  maxIdleTimeMS:        30_000,   // 30s — cierra conexiones ociosas
  serverSelectionTimeoutMS: 8_000,   // 8s — tiempo para seleccionar server
  connectTimeoutMS:     10_000,   // 10s — timeout de conexión TCP inicial
  socketTimeoutMS:      45_000,   // 45s — timeout de operación activa
  heartbeatFrequencyMS: 10_000,   // 10s — health-check al cluster
};

let isConnected = false;

/**
 * Conectar a MongoDB.
 * Idempotente: si ya está conectado, no reconecta.
 * Útil en entornos serverless donde la función puede reutilizarse.
 */
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI no está configurado en las variables de entorno');
  }

  // Reusar conexión existente (crítico en entornos serverless)
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, MONGOOSE_OPTIONS);
    isConnected = true;

    console.log(`✅ MongoDB conectado [pool: ${MONGOOSE_OPTIONS.maxPoolSize}]`);

    // Monitorear eventos de conexión para alertas operativas
    mongoose.connection.on('disconnected', () => {
      isConnected = false;
      console.warn('⚠️  MongoDB desconectado — esperando reconexión automática');
    });

    mongoose.connection.on('reconnected', () => {
      isConnected = true;
      console.log('✅ MongoDB reconectado');
    });

    mongoose.connection.on('error', (err) => {
      // No crashear el proceso — Mongoose maneja el retry automáticamente
      console.error('❌ MongoDB error de conexión:', err.message);
    });

  } catch (error) {
    isConnected = false;
    console.error('❌ Error conectando a MongoDB:', error.message);
    throw error;
  }
};

module.exports = connectDB;
