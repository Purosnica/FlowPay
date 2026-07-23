/**
 * Lógica de cliente según tipo de persona (Natural vs Jurídica).
 */

import type { Prisma } from '@prisma/client';

/** @deprecated Solo para leer datos legacy pre-migración. */
export const CLIENTE_JURIDICA_APELLIDO_PLACEHOLDER = '-';

const CONTACTO_INICIO = '---CONTACTO_PRINCIPAL---';
const CONTACTO_FIN = '---FIN_CONTACTO_PRINCIPAL---';

export interface ContactoPrincipalCliente {
  nombre: string;
  cargo: string;
  telefono: string;
  email: string;
}

export interface ClienteNombreParts {
  primer_nombres?: string | null;
  segundo_nombres?: string | null;
  primer_apellido?: string | null;
  segundo_apellido?: string | null;
  razon_social?: string | null;
  nombre_comercial?: string | null;
}

/** Select Prisma reutilizable para armar el nombre en reportes/listados. */
export const CLIENTE_NOMBRE_SELECT = {
  primer_nombres: true,
  segundo_nombres: true,
  primer_apellido: true,
  segundo_apellido: true,
  razon_social: true,
  nombre_comercial: true,
} as const satisfies Prisma.tbl_clienteSelect;

export function isPersonaJuridicaDescripcion(
  descripcion: string | null | undefined,
): boolean {
  if (!descripcion) {
    return false;
  }
  const normalized = descripcion.toLowerCase();
  return normalized.includes('jur');
}

export function isPersonaNaturalDescripcion(
  descripcion: string | null | undefined,
): boolean {
  if (!descripcion) {
    return false;
  }
  const normalized = descripcion.toLowerCase();
  return (
    normalized.includes('natural') ||
    normalized.includes('física') ||
    normalized.includes('fisica')
  );
}

export function resolveTipoPersonaKind(
  descripcion: string | null | undefined,
): 'natural' | 'juridica' | 'unknown' {
  if (isPersonaJuridicaDescripcion(descripcion)) {
    return 'juridica';
  }
  if (isPersonaNaturalDescripcion(descripcion)) {
    return 'natural';
  }
  return 'unknown';
}

function cleanPart(part: string | null | undefined): string {
  if (typeof part !== 'string') {
    return '';
  }
  const trimmed = part.trim();
  if (!trimmed || trimmed === CLIENTE_JURIDICA_APELLIDO_PLACEHOLDER) {
    return '';
  }
  return trimmed;
}

/**
 * Nombre para UI/reportes: prioriza razón social (jurídica).
 */
export function formatNombreClienteDisplay(
  cliente: ClienteNombreParts,
): string {
  const razon = cleanPart(cliente.razon_social);
  const comercial = cleanPart(cliente.nombre_comercial);
  if (razon) {
    return comercial && comercial !== razon
      ? `${razon} (${comercial})`
      : razon;
  }
  if (comercial) {
    return comercial;
  }

  return [
    cleanPart(cliente.primer_nombres),
    cleanPart(cliente.segundo_nombres),
    cleanPart(cliente.primer_apellido),
    cleanPart(cliente.segundo_apellido),
  ]
    .filter(Boolean)
    .join(' ');
}

/** Condiciones OR de búsqueda por nombre/documento/contacto. */
export function buildClienteSearchOr(
  search: string,
): Prisma.tbl_clienteWhereInput[] {
  const q = search.trim();
  if (!q) {
    return [];
  }
  return [
    { primer_nombres: { contains: q } },
    { segundo_nombres: { contains: q } },
    { primer_apellido: { contains: q } },
    { segundo_apellido: { contains: q } },
    { razon_social: { contains: q } },
    { nombre_comercial: { contains: q } },
    { numerodocumento: { contains: q } },
    { email: { contains: q } },
    { telefono: { contains: q } },
    { celular: { contains: q } },
    { contacto_nombre: { contains: q } },
    { contacto_email: { contains: q } },
  ];
}

/** @deprecated Leer contacto legacy embebido en observaciones. */
export function parseContactoPrincipal(
  observaciones: string | null | undefined,
): ContactoPrincipalCliente | null {
  if (!observaciones?.includes(CONTACTO_INICIO)) {
    return null;
  }

  const start = observaciones.indexOf(CONTACTO_INICIO);
  const end = observaciones.indexOf(CONTACTO_FIN);
  if (start < 0 || end < 0 || end <= start) {
    return null;
  }

  const block = observaciones.slice(start + CONTACTO_INICIO.length, end);
  const get = (key: string): string => {
    const match = block.match(new RegExp(`^${key}:\\s*(.*)$`, 'im'));
    return match?.[1]?.trim() ?? '';
  };

  return {
    nombre: get('nombre'),
    cargo: get('cargo'),
    telefono: get('telefono'),
    email: get('email'),
  };
}

export function stripContactoPrincipalFromObservaciones(
  observaciones: string | null | undefined,
): string {
  if (!observaciones) {
    return '';
  }
  const start = observaciones.indexOf(CONTACTO_INICIO);
  const end = observaciones.indexOf(CONTACTO_FIN);
  if (start < 0 || end < 0 || end <= start) {
    return observaciones.trim();
  }
  const before = observaciones.slice(0, start).trimEnd();
  const after = observaciones.slice(end + CONTACTO_FIN.length).trimStart();
  return [before, after].filter(Boolean).join('\n\n').trim();
}

export function resolveContactoPrincipal(cliente: {
  contacto_nombre?: string | null;
  contacto_cargo?: string | null;
  contacto_telefono?: string | null;
  contacto_email?: string | null;
  observaciones?: string | null;
}): ContactoPrincipalCliente {
  if (cliente.contacto_nombre?.trim()) {
    return {
      nombre: cliente.contacto_nombre.trim(),
      cargo: (cliente.contacto_cargo ?? '').trim(),
      telefono: (cliente.contacto_telefono ?? '').trim(),
      email: (cliente.contacto_email ?? '').trim(),
    };
  }
  const legacy = parseContactoPrincipal(cliente.observaciones);
  return (
    legacy ?? {
      nombre: '',
      cargo: '',
      telefono: '',
      email: '',
    }
  );
}

export interface ClienteFormValidationInput {
  isJuridica: boolean;
  primer_nombres?: string;
  primer_apellido?: string;
  razon_social?: string;
  idtipodocumento?: number;
  numerodocumento?: string;
  idtipopersona?: number;
  idpais?: number;
  email?: string;
  sitioweb?: string;
  telefono?: string;
  celular?: string;
  contactoNombre?: string;
  contactoCargo?: string;
  contactoTelefono?: string;
  contactoEmail?: string;
}

const PHONE_REGEX = /^[\d\s\-()]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePhoneOptional(
  value: string | undefined,
  field: string,
  label: string,
  errors: Record<string, string>,
): void {
  if (!value?.trim()) {
    return;
  }
  if (!PHONE_REGEX.test(value)) {
    errors[field] =
      `El ${label} solo debe contener números, espacios, guiones y paréntesis`;
    return;
  }
  if (value.replace(/\D/g, '').length < 7) {
    errors[field] = `El ${label} debe tener al menos 7 dígitos`;
  }
}

export function validateClienteFormByTipo(
  input: ClienteFormValidationInput,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.idtipopersona || input.idtipopersona === 0) {
    errors.idtipopersona = 'El tipo de persona es requerido';
  }

  if (input.isJuridica) {
    if (!input.razon_social?.trim()) {
      errors.razon_social = 'La razón social es requerida';
    } else if (input.razon_social.trim().length < 2) {
      errors.razon_social =
        'La razón social debe tener al menos 2 caracteres';
    }
  } else {
    if (!input.primer_nombres?.trim()) {
      errors.primer_nombres = 'El primer nombre es requerido';
    } else if (input.primer_nombres.trim().length < 2) {
      errors.primer_nombres =
        'El primer nombre debe tener al menos 2 caracteres';
    }

    if (!input.primer_apellido?.trim()) {
      errors.primer_apellido = 'El primer apellido es requerido';
    } else if (input.primer_apellido.trim().length < 2) {
      errors.primer_apellido =
        'El primer apellido debe tener al menos 2 caracteres';
    }
  }

  if (!input.idtipodocumento || input.idtipodocumento === 0) {
    errors.idtipodocumento = 'El tipo de documento es requerido';
  }

  if (!input.numerodocumento?.trim()) {
    errors.numerodocumento = input.isJuridica
      ? 'El RUC/NIT es requerido'
      : 'El número de documento es requerido';
  } else if (input.numerodocumento.trim().length < 3) {
    errors.numerodocumento = input.isJuridica
      ? 'El RUC/NIT debe tener al menos 3 caracteres'
      : 'El número de documento debe tener al menos 3 caracteres';
  }

  if (!input.idpais || input.idpais === 0) {
    errors.idpais = 'El país es requerido';
  }

  if (input.email?.trim() && !EMAIL_REGEX.test(input.email)) {
    errors.email = 'El email no es válido';
  }

  if (input.sitioweb?.trim()) {
    try {
      new URL(input.sitioweb);
    } catch {
      errors.sitioweb = 'La URL del sitio web no es válida';
    }
  }

  validatePhoneOptional(input.telefono, 'telefono', 'teléfono', errors);
  validatePhoneOptional(input.celular, 'celular', 'celular', errors);

  if (input.isJuridica) {
    if (!input.contactoNombre?.trim()) {
      errors.contactoNombre =
        'El nombre del contacto principal es requerido';
    } else if (input.contactoNombre.trim().length < 2) {
      errors.contactoNombre =
        'El nombre del contacto debe tener al menos 2 caracteres';
    }

    if (!input.contactoCargo?.trim()) {
      errors.contactoCargo = 'El cargo del contacto es requerido';
    }

    if (!input.contactoTelefono?.trim()) {
      errors.contactoTelefono =
        'El teléfono del contacto principal es requerido';
    } else {
      validatePhoneOptional(
        input.contactoTelefono,
        'contactoTelefono',
        'teléfono del contacto',
        errors,
      );
    }

    if (!input.contactoEmail?.trim()) {
      errors.contactoEmail =
        'El correo del contacto principal es requerido';
    } else if (!EMAIL_REGEX.test(input.contactoEmail)) {
      errors.contactoEmail = 'El correo del contacto no es válido';
    }
  }

  return errors;
}
