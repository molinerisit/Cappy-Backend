/**
 * Script para inicializar directorios de uploads
 */

const fs = require('fs').promises;
const path = require('path');

const DIRECTORIES = [
  'uploads',
  'uploads/temp',
  'uploads/images',
  'uploads/videos',
  'uploads/audio'
];

const initUploadDirs = async () => {
  console.log('📁 Inicializando directorios de uploads...');
  
  try {
    for (const dir of DIRECTORIES) {
      const fullPath = path.join(__dirname, '../..', dir);
      await fs.mkdir(fullPath, { recursive: true });
      console.log(`   ✅ ${dir}`);
    }
    
    // Crear .gitignore en uploads para no subir archivos
    const gitignorePath = path.join(__dirname, '../..', 'uploads', '.gitignore');
    await fs.writeFile(gitignorePath, '# Ignorar todos los archivos subidos\n*\n!.gitignore\n');
    console.log('   ✅ .gitignore creado');
    
    console.log('✅ Directorios de uploads inicializados correctamente\n');
  } catch (error) {
    console.error('❌ Error al inicializar directorios:', error);
    process.exit(1);
  }
};

// Ejecutar si se llama directamente
if (require.main === module) {
  initUploadDirs();
}

module.exports = initUploadDirs;
