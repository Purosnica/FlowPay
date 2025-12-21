/**
 * SCRIPT DE SEED PARA PERMISOS BASE
 * 
 * Este script crea los permisos base del sistema y los asigna a roles.
 * Ejecutar con: npx tsx prisma/seed-permisos.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PERMISOS_BASE = [
  {
    codigo: "CREATE_LOAN",
    nombre: "Crear Préstamo",
    descripcion: "Permite crear nuevos préstamos",
    categoria: "PRESTAMOS",
  },
  {
    codigo: "EDIT_LOAN",
    nombre: "Editar Préstamo",
    descripcion: "Permite modificar préstamos existentes",
    categoria: "PRESTAMOS",
  },
  {
    codigo: "DELETE_LOAN",
    nombre: "Eliminar Préstamo",
    descripcion: "Permite eliminar préstamos (soft delete)",
    categoria: "PRESTAMOS",
  },
  {
    codigo: "VIEW_LOAN",
    nombre: "Ver Préstamos",
    descripcion: "Permite ver información de préstamos",
    categoria: "PRESTAMOS",
  },
  {
    codigo: "APPLY_PAYMENT",
    nombre: "Registrar Pago",
    descripcion: "Permite registrar pagos y aplicarlos a cuotas",
    categoria: "PAGOS",
  },
  {
    codigo: "EDIT_PAYMENT",
    nombre: "Editar Pago",
    descripcion: "Permite modificar pagos existentes",
    categoria: "PAGOS",
  },
  {
    codigo: "DELETE_PAYMENT",
    nombre: "Eliminar Pago",
    descripcion: "Permite eliminar pagos (soft delete)",
    categoria: "PAGOS",
  },
  {
    codigo: "VIEW_PAYMENT",
    nombre: "Ver Pagos",
    descripcion: "Permite ver información de pagos",
    categoria: "PAGOS",
  },
  {
    codigo: "MANAGE_COLLECTION",
    nombre: "Gestionar Cobranza",
    descripcion: "Permite gestionar cobranza, promesas y castigos",
    categoria: "COBRANZA",
  },
  {
    codigo: "VIEW_REPORTS",
    nombre: "Ver Reportes",
    descripcion: "Permite acceder a reportes y KPIs",
    categoria: "REPORTES",
  },
  {
    codigo: "CONFIG_SYSTEM",
    nombre: "Configurar Sistema",
    descripcion: "Permite modificar la configuración del sistema",
    categoria: "CONFIGURACION",
  },
  {
    codigo: "RESTRUCTURE_LOAN",
    nombre: "Reestructurar Préstamo",
    descripcion: "Permite reestructurar préstamos",
    categoria: "PRESTAMOS",
  },
  {
    codigo: "ASSIGN_MANAGER",
    nombre: "Asignar Gestor",
    descripcion: "Permite asignar gestores a préstamos",
    categoria: "PRESTAMOS",
  },
  {
    codigo: "VIEW_PORTFOLIO",
    nombre: "Ver Cartera",
    descripcion: "Permite ver la cartera de préstamos",
    categoria: "PRESTAMOS",
  },
  {
    codigo: "MANAGE_DOCUMENTS",
    nombre: "Gestionar Documentos",
    descripcion: "Permite subir, descargar y eliminar documentos",
    categoria: "DOCUMENTOS",
  },
  {
    codigo: "MANAGE_THIRD_PARTY",
    nombre: "Gestionar Terceros",
    descripcion: "Permite gestionar liquidaciones de terceros",
    categoria: "TERCEROS",
  },
  {
    codigo: "CASTIGAR_CARTERA",
    nombre: "Castigar Cartera",
    descripcion: "Permite marcar préstamos como castigados y registrar motivos",
    categoria: "COBRANZA",
  },
];

export async function seedPermisos() {
  console.log("🌱 Iniciando seed de permisos...");

  // 1. Crear permisos base
  console.log("📝 Creando permisos base...");
  for (const permiso of PERMISOS_BASE) {
    const existe = await prisma.tbl_permiso.findUnique({
      where: { codigo: permiso.codigo },
    });

    if (!existe) {
      await prisma.tbl_permiso.create({
        data: permiso,
      });
      console.log(`  ✅ Permiso creado: ${permiso.codigo}`);
    } else {
      console.log(`  ⏭️  Permiso ya existe: ${permiso.codigo}`);
    }
  }

  // 2. Obtener todos los permisos creados
  const permisos = await prisma.tbl_permiso.findMany({
    where: {
      codigo: {
        in: PERMISOS_BASE.map((p) => p.codigo),
      },
    },
  });

  // 3. Buscar o crear rol ADMIN
  let rolAdmin = await prisma.tbl_rol.findUnique({
    where: { codigo: "ADMIN" },
  });

  if (!rolAdmin) {
    rolAdmin = await prisma.tbl_rol.create({
      data: {
        codigo: "ADMIN",
        descripcion: "Administrador del sistema",
        estado: true,
      },
    });
    console.log("  ✅ Rol ADMIN creado");
  }

  // Asignar TODOS los permisos al rol ADMIN
  console.log("🔐 Asignando permisos al rol ADMIN...");
  for (const permiso of permisos) {
    const existe = await prisma.tbl_rol_permiso.findUnique({
      where: {
        idrol_idpermiso: {
          idrol: rolAdmin.idrol,
          idpermiso: permiso.idpermiso,
        },
      },
    });

    if (!existe) {
      await prisma.tbl_rol_permiso.create({
        data: {
          idrol: rolAdmin.idrol,
          idpermiso: permiso.idpermiso,
        },
      });
      console.log(`  ✅ Permiso ${permiso.codigo} asignado a ADMIN`);
    }
  }

  // 4. Buscar o crear rol GESTOR
  let rolGestor = await prisma.tbl_rol.findUnique({
    where: { codigo: "GESTOR" },
  });

  if (!rolGestor) {
    rolGestor = await prisma.tbl_rol.create({
      data: {
        codigo: "GESTOR",
        descripcion: "Gestor de cobranza",
        estado: true,
      },
    });
    console.log("  ✅ Rol GESTOR creado");
  }

  // Asignar permisos específicos al rol GESTOR
  const permisosGestor = [
    "VIEW_LOAN",
    "VIEW_PAYMENT",
    "APPLY_PAYMENT",
    "MANAGE_COLLECTION",
    "CASTIGAR_CARTERA",
    "VIEW_PORTFOLIO",
    "ASSIGN_MANAGER",
    "VIEW_REPORTS",
    "MANAGE_DOCUMENTS",
  ];

  console.log("👤 Asignando permisos al rol GESTOR...");
  for (const codigoPermiso of permisosGestor) {
    const permiso = permisos.find((p) => p.codigo === codigoPermiso);
    if (permiso) {
      const existe = await prisma.tbl_rol_permiso.findUnique({
        where: {
          idrol_idpermiso: {
            idrol: rolGestor.idrol,
            idpermiso: permiso.idpermiso,
          },
        },
      });

      if (!existe) {
        await prisma.tbl_rol_permiso.create({
          data: {
            idrol: rolGestor.idrol,
            idpermiso: permiso.idpermiso,
          },
        });
        console.log(`  ✅ Permiso ${permiso.codigo} asignado a GESTOR`);
      }
    }
  }

  // 5. Buscar o crear rol CONSULTA
  let rolConsulta = await prisma.tbl_rol.findUnique({
    where: { codigo: "CONSULTA" },
  });

  if (!rolConsulta) {
    rolConsulta = await prisma.tbl_rol.create({
      data: {
        codigo: "CONSULTA",
        descripcion: "Usuario de solo consulta",
        estado: true,
      },
    });
    console.log("  ✅ Rol CONSULTA creado");
  }

  // Asignar permisos de solo lectura al rol CONSULTA
  const permisosConsulta = [
    "VIEW_LOAN",
    "VIEW_PAYMENT",
    "VIEW_PORTFOLIO",
    "VIEW_REPORTS",
  ];

  console.log("👁️  Asignando permisos al rol CONSULTA...");
  for (const codigoPermiso of permisosConsulta) {
    const permiso = permisos.find((p) => p.codigo === codigoPermiso);
    if (permiso) {
      const existe = await prisma.tbl_rol_permiso.findUnique({
        where: {
          idrol_idpermiso: {
            idrol: rolConsulta.idrol,
            idpermiso: permiso.idpermiso,
          },
        },
      });

      if (!existe) {
        await prisma.tbl_rol_permiso.create({
          data: {
            idrol: rolConsulta.idrol,
            idpermiso: permiso.idpermiso,
          },
        });
        console.log(`  ✅ Permiso ${permiso.codigo} asignado a CONSULTA`);
      }
    }
  }

  console.log("✅ Seed de permisos completado!");
}

// Si se ejecuta directamente, ejecutar la función y desconectar
if (require.main === module) {
  seedPermisos()
    .catch((e) => {
      console.error("❌ Error en seed de permisos:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}


