/**
 * Separa nombre completo en campos de tbl_cliente.
 */

export interface NombreClienteParseado {
  primer_nombres: string;
  segundo_nombres: string | null;
  primer_apellido: string;
  segundo_apellido: string | null;
}

export function parseNombreCliente(nombreCompleto: string): NombreClienteParseado {
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) {
    return {
      primer_nombres: 'SIN',
      segundo_nombres: null,
      primer_apellido: 'NOMBRE',
      segundo_apellido: null,
    };
  }

  if (partes.length === 1) {
    return {
      primer_nombres: partes[0],
      segundo_nombres: null,
      primer_apellido: partes[0],
      segundo_apellido: null,
    };
  }

  if (partes.length === 2) {
    return {
      primer_nombres: partes[0],
      segundo_nombres: null,
      primer_apellido: partes[1],
      segundo_apellido: null,
    };
  }

  if (partes.length === 3) {
    return {
      primer_nombres: partes[0],
      segundo_nombres: null,
      primer_apellido: partes[1],
      segundo_apellido: partes[2],
    };
  }

  const segundoApellido = partes[partes.length - 1];
  const primerApellido = partes[partes.length - 2];
  const nombres = partes.slice(0, -2);

  return {
    primer_nombres: nombres[0] ?? 'SIN',
    segundo_nombres: nombres.length > 1 ? nombres.slice(1).join(' ') : null,
    primer_apellido: primerApellido,
    segundo_apellido: segundoApellido,
  };
}
