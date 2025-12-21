/**
 * Script de prueba de conexión a la base de datos
 * Ejecutar con: node test-connection.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  try {
    console.log('🔍 Probando conexión a la base de datos...');
    const dbUrl = process.env.DATABASE_URL || '';
    const hiddenUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
    console.log('📋 URL (oculta):', hiddenUrl || 'No configurada');
    
    if (!dbUrl) {
      console.error('❌ DATABASE_URL no está configurada en el archivo .env');
      console.log('💡 Ejecuta: node fix-database-url.js para configurarla');
      return;
    }
    
    // Intentar conectar
    console.log('\n⏳ Intentando conectar...');
    await prisma.$connect();
    console.log('✅ Conexión exitosa!');
    
    // Probar una consulta simple
    console.log('\n⏳ Probando consulta...');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Consulta de prueba exitosa:', result);
    
    // Verificar si existe la tabla de usuarios
    try {
      console.log('\n⏳ Verificando tablas...');
      const tables = await prisma.$queryRaw`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
        LIMIT 10
      `;
      console.log('📊 Tablas encontradas:', tables);
      
      // Verificar si existe la tabla de usuarios
      const userTable = tables.find((t: any) => t.TABLE_NAME === 'tbl_usuario');
      if (userTable) {
        console.log('✅ La tabla tbl_usuario existe');
      } else {
        console.log('⚠️  La tabla tbl_usuario no existe. Ejecuta: npm run db:push');
      }
    } catch (e) {
      console.log('⚠️  No se pudieron listar las tablas:', e.message);
    }
    
    console.log('\n✅ ¡Todo está funcionando correctamente!');
    
  } catch (error) {
    console.error('\n❌ Error de conexión:');
    console.error('Tipo:', error.constructor.name);
    console.error('Código:', error.code);
    console.error('Mensaje:', error.message);
    
    if (error.code === 'P1000') {
      console.error('\n💡 Posibles soluciones:');
      console.error('1. Verifica que el usuario y contraseña sean correctos');
      console.error('2. Verifica que el host y puerto sean correctos');
      console.error('3. Verifica que la base de datos exista');
      console.error('4. Verifica que el usuario tenga permisos de acceso');
      console.error('5. Si usas un hosting compartido, verifica que permita conexiones remotas');
      console.error('\n📝 Ejecuta: node fix-database-url.js para reconfigurar');
      console.error('📖 Lee: SOLUCION-ERROR-DATABASE.md para más detalles');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 El servidor rechazó la conexión. Verifica:');
      console.error('1. Que el host y puerto sean correctos');
      console.error('2. Que el servidor de base de datos esté en ejecución');
      console.error('3. Que no haya un firewall bloqueando la conexión');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

