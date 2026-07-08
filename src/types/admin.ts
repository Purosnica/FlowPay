export interface RolBasico {
  idrol: number;
  codigo: string;
  descripcion: string;
  estado: boolean;
}

export interface UsuarioGestion {
  idusuario: number;
  nombre: string;
  email: string;
  telefono: string | null;
  porcentajeComision: number;
  activo: boolean;
  idrol: number;
  ultimoAcceso: string | null;
  idsupervisor: number | null;
  rol: RolBasico;
}

export interface RolGestion extends RolBasico {
  permisos: string[];
  cantidadUsuarios: number;
}

export interface PermisoCatalogo {
  idpermiso: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria: string | null;
}

export interface UsuarioFormData {
  nombre: string;
  email: string;
  telefono: string;
  idrol: number;
  password: string;
  porcentajeComision: number;
  activo: boolean;
  idsupervisor?: number | null;
}

export interface RolFormData {
  codigo: string;
  descripcion: string;
  estado: boolean;
}
