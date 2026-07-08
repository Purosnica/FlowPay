import { prisma } from '@/lib/prisma';
import {
  filtroMandante,
  requerirAccesoCliente,
  wherePrestamoClienteEnScope,
} from './mandante-scope';
import { decimalToNumber, roundMoney } from './decimal-utils';

export interface Cliente360Resumen {
  cliente: {
    idcliente: number;
    nombreCompleto: string;
    numerodocumento: string;
    celular: string | null;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
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
    fechaGestion: Date;
    tipo: string;
    resultado: string | null;
    gestor: string | null;
  }>;
  pagosRecientes: Array<{
    idpago: number;
    fechaPago: Date;
    monto: number;
    medio: string | null;
  }>;
  acuerdos: Array<{
    idacuerdo: number;
    estado: string;
    montoAcordado: number;
    fechaAcuerdo: Date;
  }>;
  reclamos: Array<{
    idreclamo: number;
    estado: string;
    descripcion: string;
    fechaLimite: Date;
  }>;
  contactos: Array<{
    idcontacto: number;
    tipo: string;
    valor: string;
    autorizado: boolean;
    noContactar: boolean;
  }>;
  totales: {
    saldoTotal: number;
    prestamosActivos: number;
    gestionesTotal: number;
    pagosMes: number;
  };
}

export async function obtenerVista360Cliente(
  idusuario: number,
  idcliente: number,
): Promise<Cliente360Resumen> {
  await requerirAccesoCliente(idusuario, idcliente);

  const cliente = await prisma.tbl_cliente.findUnique({
    where: { idcliente },
  });
  if (!cliente || !cliente.estado) {
    throw new Error('Cliente no encontrado.');
  }

  const prestamoScope = await wherePrestamoClienteEnScope(idusuario, idcliente);
  const mandanteFilter = await filtroMandante(idusuario);

  const prestamos = await prisma.tbl_prestamo.findMany({
    where: prestamoScope,
    include: { mandante: { select: { nombre: true, idmandante: true } } },
    orderBy: { saldoTotal: 'desc' },
  });

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const prestamoRelacionado = {
    idcliente,
    deletedAt: null,
    idmandante: mandanteFilter,
  };

  const [gestiones, pagos, acuerdos, reclamos, contactos] = await Promise.all([
    prisma.tbl_gestion.findMany({
      where: {
        deletedAt: null,
        prestamo: prestamoRelacionado,
      },
      orderBy: { fechaGestion: 'desc' },
      take: 10,
      include: {
        gestor: { select: { nombre: true } },
        codresult: { select: { descripcion: true } },
        codaccion: { select: { descripcion: true } },
      },
    }),
    prisma.tbl_pago.findMany({
      where: { prestamo: prestamoRelacionado, deletedAt: null },
      orderBy: { fechaPago: 'desc' },
      take: 10,
    }),
    prisma.tbl_acuerdo.findMany({
      where: { prestamo: prestamoRelacionado, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.tbl_reclamo.findMany({
      where: {
        idcliente,
        deletedAt: null,
        idmandante: mandanteFilter,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.tbl_deudor_contacto.findMany({
      where: { idcliente, deletedAt: null },
    }),
  ]);

  const nombreCompleto = [
    cliente.primer_nombres,
    cliente.segundo_nombres,
    cliente.primer_apellido,
    cliente.segundo_apellido,
  ]
    .filter(Boolean)
    .join(' ');

  const saldoTotal = prestamos.reduce(
    (s, p) => s + decimalToNumber(p.saldoTotal),
    0,
  );
  const prestamosActivos = prestamos.filter(
    (p) => Number(p.saldoTotal) > 0,
  ).length;
  const pagosMes = pagos
    .filter((p) => p.fechaPago >= inicioMes)
    .reduce((s, p) => s + decimalToNumber(p.monto), 0);

  return {
    cliente: {
      idcliente: cliente.idcliente,
      nombreCompleto,
      numerodocumento: cliente.numerodocumento,
      celular: cliente.celular,
      telefono: cliente.telefono,
      email: cliente.email,
      direccion: cliente.direccion,
    },
    prestamos: prestamos.map((p) => ({
      idprestamo: p.idprestamo,
      noPrestamo: p.noPrestamo,
      estado: p.estado,
      saldoTotal: roundMoney(decimalToNumber(p.saldoTotal)),
      diasMora: p.diasMora,
      mandante: p.mandante.nombre,
    })),
    gestionesRecientes: gestiones.map((g) => ({
      idgestion: g.idgestion,
      fechaGestion: g.fechaGestion,
      tipo: g.codaccion?.descripcion ?? 'Gestión',
      resultado: g.codresult?.descripcion ?? null,
      gestor: g.gestor?.nombre ?? null,
    })),
    pagosRecientes: pagos.map((p) => ({
      idpago: p.idpago,
      fechaPago: p.fechaPago,
      monto: roundMoney(decimalToNumber(p.monto)),
      medio: p.medio,
    })),
    acuerdos: acuerdos.map((a) => ({
      idacuerdo: a.idacuerdo,
      estado: a.estado,
      montoAcordado: roundMoney(decimalToNumber(a.montoAcordado)),
      fechaAcuerdo: a.fechaInicio,
    })),
    reclamos: reclamos.map((r) => ({
      idreclamo: r.idreclamo,
      estado: r.estado,
      descripcion: r.descripcion.slice(0, 120),
      fechaLimite: r.fechaLimite,
    })),
    contactos: contactos.map((c) => ({
      idcontacto: c.idcontacto,
      tipo: c.tipo,
      valor: c.valor,
      autorizado: c.autorizado,
      noContactar: c.noContactar,
    })),
    totales: {
      saldoTotal: roundMoney(saldoTotal),
      prestamosActivos,
      gestionesTotal: gestiones.length,
      pagosMes: roundMoney(pagosMes),
    },
  };
}
