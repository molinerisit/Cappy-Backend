/**
 * Script: migrateImageUrls.js
 * Reemplaza la BASE_URL vieja en todas las URLs de imágenes/videos en MongoDB.
 * Opera sobre el JSON serializado del documento para cubrir cualquier nivel de anidamiento.
 *
 * Uso:
 *   node src/scripts/migrateImageUrls.js <old_base_url> <new_base_url>
 *
 * Ejemplo:
 *   node src/scripts/migrateImageUrls.js http://192.168.100.4:3000 http://192.168.100.12:3000
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const OLD_URL = process.argv[2];
const NEW_URL = process.argv[3];

if (!OLD_URL || !NEW_URL) {
  console.error('Uso: node src/scripts/migrateImageUrls.js <old_base_url> <new_base_url>');
  process.exit(1);
}

const COLLECTIONS = [
  'learningnodes',
  'learningpaths',
  'countries',
  'recipes',
  'recipesteps',
  'uploadassets',
];

async function migrateCollection(collectionName, oldUrl, newUrl) {
  const collection = mongoose.connection.collection(collectionName);
  const escaped = oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const docs = await collection.find({ $where: `JSON.stringify(this).includes('${oldUrl}')` }).toArray();

  // Fallback si $where no disponible: traer todos y filtrar en JS
  let toMigrate = docs;
  if (docs.length === 0) {
    const all = await collection.find({}).toArray();
    toMigrate = all.filter(d => JSON.stringify(d).includes(oldUrl));
  }

  if (toMigrate.length === 0) return 0;

  let count = 0;
  for (const doc of toMigrate) {
    const original = JSON.stringify(doc);
    const replaced = original.split(oldUrl).join(newUrl);

    if (original !== replaced) {
      const updated = JSON.parse(replaced);
      const { _id, __v, ...rest } = updated;
      await collection.replaceOne({ _id: doc._id }, { _id: doc._id, ...rest });
      count++;
    }
  }

  return count;
}

async function migrateUrls() {
  await connectDB();
  console.log(`\nMigrando URLs: ${OLD_URL} → ${NEW_URL}\n`);

  let totalModified = 0;

  for (const collName of COLLECTIONS) {
    try {
      const modified = await migrateCollection(collName, OLD_URL, NEW_URL);
      if (modified > 0) {
        console.log(`  ✅ ${collName}: ${modified} documento(s) actualizado(s)`);
        totalModified += modified;
      }
    } catch (err) {
      console.error(`  ❌ ${collName}: error - ${err.message}`);
    }
  }

  if (totalModified === 0) {
    console.log('  (sin cambios necesarios)');
  }

  console.log(`\n✅ Total documentos modificados: ${totalModified}`);
  await mongoose.disconnect();
  process.exit(0);
}

migrateUrls().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
