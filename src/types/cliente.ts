// Tipos TypeScript para el módulo de clientes

export interface Cliente {
  idcliente: number;
  primer_nombres: string;
  segundo_nombres?: string | null;
  primer_apellido?: string | null;
  segundo_apellido?: string | null;
  razon_social?: string | null;
  nombre_comercial?: string | null;
  fechanacimiento?: string | null;
  numerodocumento: string;
  fechavencimientodoc?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  codigopostal?: string | null;
  telefono?: string | null;
  celular?: string | null;
  email?: string | null;
  sitioweb?: string | null;
  contacto_nombre?: string | null;
  contacto_cargo?: string | null;
  contacto_telefono?: string | null;
  contacto_email?: string | null;
  espep: boolean;
  observaciones?: string | null;
  estado: boolean;
  createdAt: string;
  updatedAt: string;
  tipodocumento: TipoDocumento;
  genero?: Genero | null;
  estadocivil?: EstadoCivil | null;
  ocupacion?: Ocupacion | null;
  tipopersona: TipoPersona;
  pais: Pais;
  departamento?: Departamento | null;
}

export interface TipoDocumento {
  idtipodocumento: number;
  descripcion: string;
  estado: boolean;
}

export interface Genero {
  idgenero: number;
  descripcion: string;
  estado: boolean;
}

export interface EstadoCivil {
  idestadocivil: number;
  descripcion: string;
  estado: boolean;
}

export interface Ocupacion {
  idocupacion: number;
  descripcion: string;
  estado: boolean;
}

export interface TipoPersona {
  idtipopersona: number;
  descripcion: string;
  estado: boolean;
}

export interface Pais {
  idpais: number;
  codepais: string;
  descripcion: string;
  estado: boolean;
}

export interface Departamento {
  iddepartamento: number;
  idpais: number;
  descripcion: string;
  estado: boolean;
  pais: Pais;
}

export interface ClientePage {
  clientes: Cliente[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ClienteFilters {
  search?: string;
  idtipodocumento?: number;
  idgenero?: number;
  idestadocivil?: number;
  idocupacion?: number;
  idtipopersona?: number;
  idpais?: number;
  iddepartamento?: number;
  estado?: boolean;
}

export interface CreateClienteInput {
  primer_nombres?: string;
  segundo_nombres?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  razon_social?: string;
  nombre_comercial?: string;
  fechanacimiento?: string;
  idtipodocumento?: number;
  numerodocumento: string;
  fechavencimientodoc?: string;
  idgenero?: number;
  idestadocivil?: number;
  idocupacion?: number;
  idtipopersona?: number;
  idpais?: number;
  iddepartamento?: number;
  direccion?: string;
  ciudad?: string;
  codigopostal?: string;
  telefono?: string;
  celular?: string;
  email?: string;
  sitioweb?: string;
  contacto_nombre?: string;
  contacto_cargo?: string;
  contacto_telefono?: string;
  contacto_email?: string;
  espep?: boolean;
  observaciones?: string;
  estado?: boolean;
}

export interface UpdateClienteInput extends Partial<CreateClienteInput> {
  idcliente: number;
}

/** Respuesta GraphQL de `clienteVista360` (fechas serializadas como string). */
export interface ClienteVista360 {
  cliente: {
    idcliente: number;
    nombreCompleto: string;
    numerodocumento: string;
    celular: string | null;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
  };
  totales: {
    saldoTotal: number;
    prestamosActivos: number;
    gestionesTotal: number;
    pagosMes: number;
  };
  prestamos: Array<{
    idprestamo: number;
    noPrestamo: string;
    estado: string;
    saldoTotal: number;
    diasMora: number;
    mandante: string;
  }>;
  gestionesRecientes: Array<{
    idgestion: number;
    fechaGestion: string;
    tipo: string;
    resultado: string | null;
    gestor: string | null;
  }>;
  pagosRecientes: Array<{
    idpago: number;
    fechaPago: string;
    monto: number;
    medio: string | null;
  }>;
  reclamos: Array<{
    idreclamo: number;
    estado: string;
    descripcion: string;
    fechaLimite: string;
  }>;
  contactos: Array<{
    idcontacto: number;
    tipo: string;
    valor: string;
    autorizado: boolean;
    noContactar: boolean;
  }>;
}
