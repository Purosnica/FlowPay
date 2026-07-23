/**
 * Verificación de fallos ocultos post-migración persona jurídica.
 */

import { CreateClienteInputSchema } from '../src/lib/graphql/resolvers/cliente/types';
import {
  buildClienteSearchOr,
  formatNombreClienteDisplay,
  resolveContactoPrincipal,
  stripContactoPrincipalFromObservaciones,
  validateClienteFormByTipo,
} from '../src/lib/logic/cliente-tipo-persona-logic';

const fails: string[] = [];
const ok = (cond: boolean, msg: string): void => {
  if (!cond) fails.push(msg);
};

const juridicaZod = CreateClienteInputSchema.safeParse({
  razon_social: 'Empresa SA',
  nombre_comercial: 'Empresa',
  idtipodocumento: 1,
  numerodocumento: 'J0310000000001',
  idtipopersona: 2,
  idpais: 1,
  contacto_nombre: 'Ana Lopez',
  contacto_cargo: 'Gerente',
  contacto_telefono: '88887777',
  contacto_email: 'ana@empresa.com',
});
ok(juridicaZod.success, `zod juridica: ${JSON.stringify(juridicaZod.error?.issues)}`);

const naturalZod = CreateClienteInputSchema.safeParse({
  primer_nombres: 'Juan',
  primer_apellido: 'Perez',
  idtipodocumento: 1,
  numerodocumento: '001',
  idtipopersona: 1,
  idpais: 1,
});
ok(naturalZod.success, `zod natural: ${JSON.stringify(naturalZod.error?.issues)}`);

const nullNames = CreateClienteInputSchema.safeParse({
  primer_nombres: null,
  primer_apellido: null,
  razon_social: 'X SA',
  idtipodocumento: 1,
  numerodocumento: 'J1',
  idtipopersona: 2,
  idpais: 1,
  contacto_nombre: 'Ana',
  contacto_cargo: 'G',
  contacto_telefono: '88887777',
  contacto_email: 'a@b.com',
});
ok(
  nullNames.success &&
    nullNames.data.primer_nombres === null &&
    nullNames.data.primer_apellido === null,
  'null names stay null (no coerce to empty)',
);

// Update merge semantics: null must not wipe via ??
const incomingNull: string | null | undefined = null;
const existente = 'Juan';
const incomingEmpty = '';
ok((incomingNull ?? existente) === 'Juan', 'nullish coalesce preserves existing');
ok(
  (incomingEmpty.length > 0 ? incomingEmpty : existente) === existente,
  'empty string can be treated as missing',
);

ok(
  formatNombreClienteDisplay({
    primer_nombres: 'Solo',
    primer_apellido: null,
    razon_social: null,
  }) === 'Solo',
  'natural sin apellido',
);
ok(
  formatNombreClienteDisplay({
    primer_nombres: 'X',
    primer_apellido: '-',
    razon_social: 'Real SA',
  }) === 'Real SA',
  'prioriza razon',
);
ok(
  formatNombreClienteDisplay({
    primer_nombres: '',
    primer_apellido: null,
    razon_social: null,
    nombre_comercial: 'Comercial',
  }) === 'Comercial',
  'fallback nombre comercial',
);

const legacyObs =
  'nota\n\n---CONTACTO_PRINCIPAL---\nnombre: Legacy\ncargo: CEO\ntelefono: 11112222\nemail: l@e.com\n---FIN_CONTACTO_PRINCIPAL---';
ok(
  resolveContactoPrincipal({ observaciones: legacyObs }).nombre === 'Legacy',
  'legacy contacto',
);
ok(
  stripContactoPrincipalFromObservaciones(legacyObs) === 'nota',
  'strip leaves note',
);

const ors = buildClienteSearchOr('acme');
ok(ors.some((o) => 'razon_social' in o), 'search razon_social');
ok(ors.some((o) => 'contacto_nombre' in o), 'search contacto_nombre');

const errNatural = validateClienteFormByTipo({
  isJuridica: false,
  primer_nombres: 'Juan',
  idtipodocumento: 1,
  numerodocumento: '123',
  idtipopersona: 1,
  idpais: 1,
});
ok(!!errNatural.primer_apellido, 'natural missing apellido');

const errJuridica = validateClienteFormByTipo({
  isJuridica: true,
  razon_social: 'ACME',
  idtipodocumento: 1,
  numerodocumento: '123',
  idtipopersona: 2,
  idpais: 1,
});
ok(!!errJuridica.contactoNombre, 'juridica missing contacto');
ok(!errJuridica.primer_apellido, 'juridica no exige apellido');

if (fails.length > 0) {
  console.error('FAIL\n' + fails.join('\n'));
  process.exit(1);
}

console.log('OK hidden-failure checks');
