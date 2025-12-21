/**
 * Script para ayudar a corregir la URL de la base de datos
 * Ejecutar con: node fix-database-url.js
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function encodePassword(password) {
  return encodeURIComponent(password);
}

async function main() {
  console.log('🔧 Configuración de Base de Datos - FlowPay\n');
  console.log('Este script te ayudará a configurar correctamente la URL de conexión.\n');

  const host = await question('Host de la base de datos (ej: bh8932.banahosting.com): ');
  const port = await question('Puerto (presiona Enter para 3306): ') || '3306';
  const database = await question('Nombre de la base de datos (ej: gcvqhfxd_flowpay): ');
  const username = await question('Usuario de la base de datos (ej: gcvqhfxd_bssilva): ');
  const password = await question('Contraseña de la base de datos: ');

  // Codificar la contraseña
  const encodedPassword = encodePassword(password);
  
  // Construir la URL
  const databaseUrl = `mysql://${username}:${encodedPassword}@${host}:${port}/${database}`;

  console.log('\n📋 URL generada (oculta):');
  console.log(`mysql://${username}:${'*'.repeat(encodedPassword.length)}@${host}:${port}/${database}`);
  console.log('\n📋 URL completa (para copiar):');
  console.log(databaseUrl);

  const save = await question('\n¿Deseas guardar esta configuración en el archivo .env? (s/n): ');
  
  if (save.toLowerCase() === 's' || save.toLowerCase() === 'y' || save.toLowerCase() === 'sí') {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    // Leer archivo .env existente si existe
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Reemplazar o agregar DATABASE_URL
    if (envContent.includes('DATABASE_URL=')) {
      envContent = envContent.replace(
        /DATABASE_URL=.*/,
        `DATABASE_URL="${databaseUrl}"`
      );
    } else {
      envContent += `\nDATABASE_URL="${databaseUrl}"\n`;
    }
    
    // Guardar archivo
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('\n✅ Archivo .env actualizado correctamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('1. Ejecuta: node test-connection.js');
    console.log('2. Si la conexión es exitosa, ejecuta: npm run db:push');
    console.log('3. Luego ejecuta: npm run db:seed');
  } else {
    console.log('\n📝 Copia manualmente esta línea a tu archivo .env:');
    console.log(`DATABASE_URL="${databaseUrl}"`);
  }

  rl.close();
}

main().catch(console.error);

