// Tipos TypeScript para el módulo de clientes

export interface Cliente {
  idcliente: number;
  primer_nombres: string;
  segundo_nombres?: string | null;
  primer_apellido: string;
  segundo_apellido?: string | null;
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
  primer_nombres: string;
  segundo_nombres?: string;
  primer_apellido: string;
  segundo_apellido?: string;
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
  espep?: boolean;
  observaciones?: string;
  estado?: boolean;
}

export interface UpdateClienteInput extends Partial<CreateClienteInput> {
  idcliente: number;
}










