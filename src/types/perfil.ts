export interface PerfilFormData {
  nombre: string;
  email: string;
  telefono: string;
  passwordActual: string;
  passwordNueva: string;
  confirmarPassword: string;
}

export interface UsuarioPerfil {
  idusuario: number;
  nombre: string;
  email: string;
  telefono: string | null;
  ultimoAcceso: string | null;
  rol: {
    idrol: number;
    codigo: string;
    descripcion: string;
  };
}
