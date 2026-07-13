/**
 * UAT automatizado — matriz RBAC por rol demo.
 * Ejecutar: npm run test:uat
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { obtenerPermisosUsuario } from '@/lib/permissions/permission-service';
import {
  PERMISOS_ADMIN,
  PERMISOS_COBRADOR,
  PERMISOS_GERENTE,
  PERMISOS_SUPERVISOR,
} from '@/lib/permissions/permiso-codes';
import {
  obtenerReglaPermisoRuta,
  usuarioTieneAccesoRuta,
} from '@/lib/navigation/route-permissions';

const prisma = new PrismaClient();

interface RolExpectativa {
  email: string;
  rolCodigo: string;
  permisosEsperados: readonly string[];
}

interface RutaExpectativa {
  ruta: string;
  porRol: Record<string, boolean>;
}

const ROLES: RolExpectativa[] = [
  {
    email: 'cobrador@flowpay.com',
    rolCodigo: 'COBRADOR',
    permisosEsperados: PERMISOS_COBRADOR,
  },
  {
    email: 'supervisor@flowpay.com',
    rolCodigo: 'SUPERVISOR',
    permisosEsperados: PERMISOS_SUPERVISOR,
  },
  {
    email: 'gerente@flowpay.com',
    rolCodigo: 'GERENTE',
    permisosEsperados: PERMISOS_GERENTE,
  },
  {
    email: 'admin@flowpay.com',
    rolCodigo: 'ADMIN',
    permisosEsperados: PERMISOS_ADMIN,
  },
];

const MATRIZ_RUTAS: RutaExpectativa[] = [
  {
    ruta: '/dashboard',
    porRol: { COBRADOR: true, SUPERVISOR: true, GERENTE: true, ADMIN: true },
  },
  {
    ruta: '/cobranza/mi-dia',
    porRol: { COBRADOR: true, SUPERVISOR: true, GERENTE: true, ADMIN: true },
  },
  {
    ruta: '/cobranza/bandeja',
    porRol: { COBRADOR: true, SUPERVISOR: true, GERENTE: true, ADMIN: true },
  },
  {
    ruta: '/cobranza/cartera',
    porRol: { COBRADOR: true, SUPERVISOR: true, GERENTE: true, ADMIN: true },
  },
  {
    ruta: '/clientes',
    porRol: { COBRADOR: true, SUPERVISOR: true, GERENTE: true, ADMIN: true },
  },
  {
    ruta: '/cobranza/mandantes',
    porRol: { COBRADOR: true, SUPERVISOR: true, GERENTE: true, ADMIN: true },
  },
  {
    ruta: '/cobranza/reportes',
    porRol: { COBRADOR: true, SUPERVISOR: true, GERENTE: true, ADMIN: true },
  },
  {
    ruta: '/cobranza/reportes/informe-gerencial',
    porRol: { COBRADOR: true, SUPERVISOR: true, GERENTE: true, ADMIN: true },
  },
  {
    ruta: '/cobranza/importar',
    porRol: { COBRADOR: false, SUPERVISOR: true, GERENTE: true, ADMIN: true },
  },
  {
    ruta: '/cobranza/asignacion',
    porRol: { COBRADOR: false, SUPERVISOR: true, GERENTE: true, ADMIN: true },
  },
  {
    ruta: '/cobranza/centro-inteligencia',
    porRol: { COBRADOR: false, SUPERVISOR: true, GERENTE: true, ADMIN: true },
  },
  {
    ruta: '/cobranza/equipo',
    porRol: { COBRADOR: false, SUPERVISOR: true, GERENTE: true, ADMIN: true },
  },
  {
    ruta: '/cobranza/liquidaciones',
    porRol: { COBRADOR: false, SUPERVISOR: true, GERENTE: true, ADMIN: true },
  },
  {
    ruta: '/configuracion/usuarios',
    porRol: { COBRADOR: false, SUPERVISOR: false, GERENTE: true, ADMIN: true },
  },
  {
    ruta: '/configuracion',
    porRol: { COBRADOR: false, SUPERVISOR: false, GERENTE: false, ADMIN: true },
  },
  {
    ruta: '/configuracion/auditoria',
    porRol: { COBRADOR: false, SUPERVISOR: false, GERENTE: false, ADMIN: true },
  },
];

let fallos = 0;

function ok(msg: string): void {
  process.stdout.write(`  ✅ ${msg}\n`);
}

function fail(msg: string): void {
  fallos += 1;
  process.stderr.write(`  ❌ ${msg}\n`);
}

async function validarPermisosRol(def: RolExpectativa): Promise<string[]> {
  const usuario = await prisma.tbl_usuario.findFirst({
    where: { email: def.email, activo: true, deletedAt: null },
    include: { rol: true },
  });

  if (!usuario) {
    fail(`Usuario demo ${def.email} no encontrado`);
    return [];
  }

  if (usuario.rol?.codigo !== def.rolCodigo) {
    fail(
      `${def.email} rol=${usuario.rol?.codigo ?? '?'} esperado ${def.rolCodigo}`,
    );
  } else {
    ok(`${def.email} rol ${def.rolCodigo}`);
  }

  const permisos = await obtenerPermisosUsuario(usuario.idusuario);
  const esperados = new Set(def.permisosEsperados);

  for (const codigo of def.permisosEsperados) {
    if (!permisos.includes(codigo)) {
      fail(`${def.rolCodigo} falta permiso ${codigo}`);
    }
  }

  const extras = permisos.filter((p) => !esperados.has(p));
  if (extras.length > 0) {
    ok(
      `${def.rolCodigo}: +${extras.length} permisos adicionales en BD (custom)`,
    );
  }

  ok(`${def.rolCodigo}: ${permisos.length} permisos activos`);
  return permisos;
}

function validarMatrizRutas(
  permisosPorRol: Map<string, string[]>,
): void {
  for (const fila of MATRIZ_RUTAS) {
    const regla = obtenerReglaPermisoRuta(fila.ruta);
    if (!regla) {
      fail(`Sin regla de permiso para ${fila.ruta}`);
      continue;
    }

    for (const [rol, esperado] of Object.entries(fila.porRol)) {
      const permisos = permisosPorRol.get(rol) ?? [];
      const tiene = usuarioTieneAccesoRuta(permisos, regla);
      if (tiene !== esperado) {
        fail(
          `${rol} ${fila.ruta}: esperado ${esperado ? 'permitido' : 'bloqueado'}, obtuvo ${tiene ? 'permitido' : 'bloqueado'}`,
        );
      }
    }
    ok(`Matriz ruta ${fila.ruta}`);
  }
}

async function main(): Promise<void> {
  process.stdout.write('\n🧪 UAT — Matriz RBAC automatizada\n\n');

  await prisma.$connect();

  const permisosPorRol = new Map<string, string[]>();
  for (const def of ROLES) {
    process.stdout.write(`\n📋 ${def.rolCodigo}\n`);
    const permisos = await validarPermisosRol(def);
    permisosPorRol.set(def.rolCodigo, permisos);
  }

  process.stdout.write('\n📋 Rutas críticas\n');
  validarMatrizRutas(permisosPorRol);

  process.stdout.write('\n────────────────────────────────────\n');
  if (fallos > 0) {
    process.stderr.write(`  Fallos: ${fallos}\n`);
    process.exit(1);
  }
  process.stdout.write('  UAT RBAC: OK\n');
}

void main()
  .catch((err) => {
    process.stderr.write(
      `${err instanceof Error ? err.message : 'Error UAT'}\n`,
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
