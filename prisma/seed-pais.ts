/**
 * SCRIPT DE SEED PARA PAÍSES
 * 
 * Este script crea los países base del sistema usando códigos ISO 3166-1 alpha-2.
 * Ejecutar con: npx tsx prisma/seed-pais.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Lista completa de países con códigos ISO 3166-1 alpha-2
const PAISES = [
  { codepais: "AF", descripcion: "Afganistán" },
  { codepais: "AL", descripcion: "Albania" },
  { codepais: "DE", descripcion: "Alemania" },
  { codepais: "AD", descripcion: "Andorra" },
  { codepais: "AO", descripcion: "Angola" },
  { codepais: "AG", descripcion: "Antigua y Barbuda" },
  { codepais: "SA", descripcion: "Arabia Saudita" },
  { codepais: "DZ", descripcion: "Argelia" },
  { codepais: "AR", descripcion: "Argentina" },
  { codepais: "AM", descripcion: "Armenia" },
  { codepais: "AU", descripcion: "Australia" },
  { codepais: "AT", descripcion: "Austria" },
  { codepais: "AZ", descripcion: "Azerbaiyán" },
  { codepais: "BS", descripcion: "Bahamas" },
  { codepais: "BD", descripcion: "Bangladés" },
  { codepais: "BB", descripcion: "Barbados" },
  { codepais: "BH", descripcion: "Baréin" },
  { codepais: "BE", descripcion: "Bélgica" },
  { codepais: "BZ", descripcion: "Belice" },
  { codepais: "BJ", descripcion: "Benín" },
  { codepais: "BY", descripcion: "Bielorrusia" },
  { codepais: "MM", descripcion: "Birmania" },
  { codepais: "BO", descripcion: "Bolivia" },
  { codepais: "BA", descripcion: "Bosnia y Herzegovina" },
  { codepais: "BW", descripcion: "Botsuana" },
  { codepais: "BR", descripcion: "Brasil" },
  { codepais: "BN", descripcion: "Brunéi" },
  { codepais: "BG", descripcion: "Bulgaria" },
  { codepais: "BF", descripcion: "Burkina Faso" },
  { codepais: "BI", descripcion: "Burundi" },
  { codepais: "BT", descripcion: "Bután" },
  { codepais: "CV", descripcion: "Cabo Verde" },
  { codepais: "KH", descripcion: "Camboya" },
  { codepais: "CM", descripcion: "Camerún" },
  { codepais: "CA", descripcion: "Canadá" },
  { codepais: "QA", descripcion: "Catar" },
  { codepais: "TD", descripcion: "Chad" },
  { codepais: "CL", descripcion: "Chile" },
  { codepais: "CN", descripcion: "China" },
  { codepais: "CY", descripcion: "Chipre" },
  { codepais: "CO", descripcion: "Colombia" },
  { codepais: "KM", descripcion: "Comoras" },
  { codepais: "KP", descripcion: "Corea del Norte" },
  { codepais: "KR", descripcion: "Corea del Sur" },
  { codepais: "CI", descripcion: "Costa de Marfil" },
  { codepais: "CR", descripcion: "Costa Rica" },
  { codepais: "HR", descripcion: "Croacia" },
  { codepais: "CU", descripcion: "Cuba" },
  { codepais: "DK", descripcion: "Dinamarca" },
  { codepais: "DM", descripcion: "Dominica" },
  { codepais: "EC", descripcion: "Ecuador" },
  { codepais: "EG", descripcion: "Egipto" },
  { codepais: "SV", descripcion: "El Salvador" },
  { codepais: "AE", descripcion: "Emiratos Árabes Unidos" },
  { codepais: "ER", descripcion: "Eritrea" },
  { codepais: "SK", descripcion: "Eslovaquia" },
  { codepais: "SI", descripcion: "Eslovenia" },
  { codepais: "ES", descripcion: "España" },
  { codepais: "US", descripcion: "Estados Unidos" },
  { codepais: "EE", descripcion: "Estonia" },
  { codepais: "ET", descripcion: "Etiopía" },
  { codepais: "PH", descripcion: "Filipinas" },
  { codepais: "FI", descripcion: "Finlandia" },
  { codepais: "FJ", descripcion: "Fiyi" },
  { codepais: "FR", descripcion: "Francia" },
  { codepais: "GA", descripcion: "Gabón" },
  { codepais: "GM", descripcion: "Gambia" },
  { codepais: "GE", descripcion: "Georgia" },
  { codepais: "GH", descripcion: "Ghana" },
  { codepais: "GD", descripcion: "Granada" },
  { codepais: "GR", descripcion: "Grecia" },
  { codepais: "GT", descripcion: "Guatemala" },
  { codepais: "GN", descripcion: "Guinea" },
  { codepais: "GW", descripcion: "Guinea-Bisáu" },
  { codepais: "GQ", descripcion: "Guinea Ecuatorial" },
  { codepais: "GY", descripcion: "Guyana" },
  { codepais: "HT", descripcion: "Haití" },
  { codepais: "HN", descripcion: "Honduras" },
  { codepais: "HU", descripcion: "Hungría" },
  { codepais: "IN", descripcion: "India" },
  { codepais: "ID", descripcion: "Indonesia" },
  { codepais: "IR", descripcion: "Irán" },
  { codepais: "IQ", descripcion: "Irak" },
  { codepais: "IE", descripcion: "Irlanda" },
  { codepais: "IS", descripcion: "Islandia" },
  { codepais: "MH", descripcion: "Islas Marshall" },
  { codepais: "SB", descripcion: "Islas Salomón" },
  { codepais: "IL", descripcion: "Israel" },
  { codepais: "IT", descripcion: "Italia" },
  { codepais: "JM", descripcion: "Jamaica" },
  { codepais: "JP", descripcion: "Japón" },
  { codepais: "JO", descripcion: "Jordania" },
  { codepais: "KZ", descripcion: "Kazajistán" },
  { codepais: "KE", descripcion: "Kenia" },
  { codepais: "KG", descripcion: "Kirguistán" },
  { codepais: "KI", descripcion: "Kiribati" },
  { codepais: "KW", descripcion: "Kuwait" },
  { codepais: "LA", descripcion: "Laos" },
  { codepais: "LS", descripcion: "Lesoto" },
  { codepais: "LV", descripcion: "Letonia" },
  { codepais: "LB", descripcion: "Líbano" },
  { codepais: "LR", descripcion: "Liberia" },
  { codepais: "LY", descripcion: "Libia" },
  { codepais: "LI", descripcion: "Liechtenstein" },
  { codepais: "LT", descripcion: "Lituania" },
  { codepais: "LU", descripcion: "Luxemburgo" },
  { codepais: "MG", descripcion: "Madagascar" },
  { codepais: "MY", descripcion: "Malasia" },
  { codepais: "MW", descripcion: "Malaui" },
  { codepais: "MV", descripcion: "Maldivas" },
  { codepais: "ML", descripcion: "Malí" },
  { codepais: "MT", descripcion: "Malta" },
  { codepais: "MA", descripcion: "Marruecos" },
  { codepais: "MU", descripcion: "Mauricio" },
  { codepais: "MR", descripcion: "Mauritania" },
  { codepais: "MX", descripcion: "México" },
  { codepais: "FM", descripcion: "Micronesia" },
  { codepais: "MD", descripcion: "Moldavia" },
  { codepais: "MC", descripcion: "Mónaco" },
  { codepais: "MN", descripcion: "Mongolia" },
  { codepais: "ME", descripcion: "Montenegro" },
  { codepais: "MZ", descripcion: "Mozambique" },
  { codepais: "NA", descripcion: "Namibia" },
  { codepais: "NR", descripcion: "Nauru" },
  { codepais: "NP", descripcion: "Nepal" },
  { codepais: "NI", descripcion: "Nicaragua" },
  { codepais: "NE", descripcion: "Níger" },
  { codepais: "NG", descripcion: "Nigeria" },
  { codepais: "NO", descripcion: "Noruega" },
  { codepais: "NZ", descripcion: "Nueva Zelanda" },
  { codepais: "OM", descripcion: "Omán" },
  { codepais: "NL", descripcion: "Países Bajos" },
  { codepais: "PK", descripcion: "Pakistán" },
  { codepais: "PW", descripcion: "Palaos" },
  { codepais: "PA", descripcion: "Panamá" },
  { codepais: "PG", descripcion: "Papúa Nueva Guinea" },
  { codepais: "PY", descripcion: "Paraguay" },
  { codepais: "PE", descripcion: "Perú" },
  { codepais: "PL", descripcion: "Polonia" },
  { codepais: "PT", descripcion: "Portugal" },
  { codepais: "GB", descripcion: "Reino Unido" },
  { codepais: "CF", descripcion: "República Centroafricana" },
  { codepais: "CZ", descripcion: "República Checa" },
  { codepais: "CG", descripcion: "República del Congo" },
  { codepais: "CD", descripcion: "República Democrática del Congo" },
  { codepais: "DO", descripcion: "República Dominicana" },
  { codepais: "RW", descripcion: "Ruanda" },
  { codepais: "RO", descripcion: "Rumania" },
  { codepais: "RU", descripcion: "Rusia" },
  { codepais: "WS", descripcion: "Samoa" },
  { codepais: "LC", descripcion: "Santa Lucía" },
  { codepais: "VC", descripcion: "San Vicente y las Granadinas" },
  { codepais: "KN", descripcion: "San Cristóbal y Nieves" },
  { codepais: "ST", descripcion: "Santo Tomé y Príncipe" },
  { codepais: "SN", descripcion: "Senegal" },
  { codepais: "RS", descripcion: "Serbia" },
  { codepais: "SC", descripcion: "Seychelles" },
  { codepais: "SL", descripcion: "Sierra Leona" },
  { codepais: "SG", descripcion: "Singapur" },
  { codepais: "SY", descripcion: "Siria" },
  { codepais: "SO", descripcion: "Somalia" },
  { codepais: "LK", descripcion: "Sri Lanka" },
  { codepais: "ZA", descripcion: "Sudáfrica" },
  { codepais: "SD", descripcion: "Sudán" },
  { codepais: "SS", descripcion: "Sudán del Sur" },
  { codepais: "SE", descripcion: "Suecia" },
  { codepais: "CH", descripcion: "Suiza" },
  { codepais: "SR", descripcion: "Surinam" },
  { codepais: "TH", descripcion: "Tailandia" },
  { codepais: "TW", descripcion: "Taiwán" },
  { codepais: "TZ", descripcion: "Tanzania" },
  { codepais: "TJ", descripcion: "Tayikistán" },
  { codepais: "TL", descripcion: "Timor Oriental" },
  { codepais: "TG", descripcion: "Togo" },
  { codepais: "TO", descripcion: "Tonga" },
  { codepais: "TT", descripcion: "Trinidad y Tobago" },
  { codepais: "TN", descripcion: "Túnez" },
  { codepais: "TM", descripcion: "Turkmenistán" },
  { codepais: "TR", descripcion: "Turquía" },
  { codepais: "TV", descripcion: "Tuvalu" },
  { codepais: "UA", descripcion: "Ucrania" },
  { codepais: "UG", descripcion: "Uganda" },
  { codepais: "UY", descripcion: "Uruguay" },
  { codepais: "UZ", descripcion: "Uzbekistán" },
  { codepais: "VU", descripcion: "Vanuatu" },
  { codepais: "VE", descripcion: "Venezuela" },
  { codepais: "VN", descripcion: "Vietnam" },
  { codepais: "YE", descripcion: "Yemen" },
  { codepais: "DJ", descripcion: "Yibuti" },
  { codepais: "ZM", descripcion: "Zambia" },
  { codepais: "ZW", descripcion: "Zimbabue" },
];

export async function seedPais() {
  console.log("\n🌱 Iniciando seed de países...");
  console.log(`📊 Total de países a procesar: ${PAISES.length}\n`);

  let creados = 0;
  let existentes = 0;
  let errores = 0;

  for (const pais of PAISES) {
    try {
      const existe = await prisma.tbl_pais.findFirst({
        where: { codepais: pais.codepais },
      });

      if (!existe) {
        await prisma.tbl_pais.create({
          data: {
            codepais: pais.codepais,
            descripcion: pais.descripcion,
            estado: true,
          },
        });
        creados++;
        console.log(`  ✅ País creado: ${pais.descripcion} (${pais.codepais})`);
      } else {
        // Actualizar si el nombre cambió
        if (existe.descripcion !== pais.descripcion) {
          await prisma.tbl_pais.update({
            where: { idpais: existe.idpais },
            data: { descripcion: pais.descripcion },
          });
          console.log(`  🔄 País actualizado: ${pais.descripcion} (${pais.codepais})`);
        } else {
          existentes++;
        }
      }
    } catch (error) {
      errores++;
      console.error(`  ❌ Error al procesar ${pais.descripcion} (${pais.codepais}):`, error);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Resumen del seed de países:");
  console.log(`   ✅ Países creados: ${creados}`);
  console.log(`   ⏭️  Países ya existentes: ${existentes}`);
  if (errores > 0) {
    console.log(`   ❌ Errores: ${errores}`);
  }
  console.log(`   📈 Total procesados: ${PAISES.length}`);
  console.log("✅ Seed de países completado!");
}

// Si se ejecuta directamente
if (require.main === module) {
  seedPais()
    .catch((e) => {
      console.error("❌ Error en seed de países:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

