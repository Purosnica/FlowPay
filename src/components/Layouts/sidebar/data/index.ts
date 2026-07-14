import * as Icons from "../icons";
import type { NavSection } from "@/lib/navigation/filter-nav-by-permisos";
import {
  PERMISO,
  PERMISOS_REPORTE_CUALQUIERA,
} from "@/lib/permissions/permiso-codes";
import {
  permisosDeReporte,
  REPORTE_KEY,
} from "@/lib/permissions/reporte-permisos";

export const NAV_DATA: NavSection[] = [
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Dashboard",
        icon: Icons.HomeIcon,
        url: "/dashboard",
        permiso: PERMISO.CARTERA_READ,
      },
      {
        title: "Mi día",
        url: "/cobranza/mi-dia",
        icon: Icons.HomeIcon,
        permiso: PERMISO.CARTERA_READ,
      },
      {
        title: "Clientes",
        url: "/clientes",
        icon: Icons.User,
        permiso: PERMISO.CARTERA_READ,
      },
      {
        title: "Cobranza",
        icon: Icons.PieChart,
        permisos: [PERMISO.CARTERA_READ, PERMISO.GESTION_READ],
        items: [
          {
            title: "Centro de Inteligencia",
            url: "/cobranza/centro-inteligencia",
            permiso: PERMISO.INTELIGENCIA_READ,
          },
          {
            title: "Mi equipo",
            url: "/cobranza/equipo",
            permiso: PERMISO.EQUIPO_READ,
          },
          {
            title: "Gamificación",
            url: "/cobranza/gamificacion",
            permiso: PERMISO.EQUIPO_READ,
          },
          {
            title: "Mandantes",
            url: "/cobranza/mandantes",
            permiso: PERMISO.MANDANTE_READ,
          },
          {
            title: "Plantillas",
            url: "/cobranza/plantillas",
            permiso: PERMISO.MANDANTE_READ,
          },
          {
            title: "Plantillas mensaje",
            url: "/cobranza/plantillas-mensaje",
            permiso: PERMISO.MANDANTE_WRITE,
          },
          {
            title: "Importar",
            url: "/cobranza/importar",
            permiso: PERMISO.CARTERA_WRITE,
          },
          {
            title: "Historial cargas",
            url: "/cobranza/historial-cargas",
            permiso: PERMISO.CARTERA_READ,
          },
          {
            title: "Asignación",
            url: "/cobranza/asignacion",
            permiso: PERMISO.CARTERA_WRITE,
          },
          {
            title: "Cartera",
            url: "/cobranza/cartera",
            permiso: PERMISO.CARTERA_READ,
          },
          {
            title: "Campañas",
            url: "/cobranza/campanas",
            permiso: PERMISO.CARTERA_READ,
          },
          {
            title: "Wizard campaña",
            url: "/cobranza/campanas/wizard",
            permiso: PERMISO.CARTERA_WRITE,
          },
          {
            title: "Mi bandeja",
            url: "/cobranza/bandeja",
            permiso: PERMISO.CARTERA_READ,
          },
          {
            title: "Mis gestiones",
            url: "/cobranza/gestiones",
            permiso: PERMISO.GESTION_READ,
          },
          {
            title: "Reclamos",
            url: "/cobranza/reclamos",
            permiso: PERMISO.GESTION_READ,
          },
          {
            title: "Agencias",
            url: "/cobranza/agencias",
            permiso: PERMISO.CARTERA_READ,
          },
          {
            title: "Liquidaciones",
            url: "/cobranza/liquidaciones",
            permiso: PERMISO.LIQUIDACION_READ,
          },
          {
            title: "Conciliaciones",
            url: "/cobranza/conciliaciones",
            permiso: PERMISO.PAGO_READ,
          },
        ],
      },
      {
        title: "Reportes",
        icon: Icons.Table,
        permisos: [...PERMISOS_REPORTE_CUALQUIERA],
        items: [
          {
            title: "Reportes de cobranza",
            url: "/cobranza/reportes",
            permisos: permisosDeReporte(REPORTE_KEY.hub),
          },
          {
            title: "Ganancias",
            url: "/cobranza/reportes/ganancias",
            permisos: permisosDeReporte(REPORTE_KEY.ganancias),
          },
          {
            title: "Comisiones cobradores",
            url: "/cobranza/reportes/comisiones-cobradores",
            permisos: permisosDeReporte(REPORTE_KEY.comisionesCobradores),
          },
          {
            title: "Efectividad",
            url: "/cobranza/reportes/efectividad",
            permisos: permisosDeReporte(REPORTE_KEY.efectividad),
          },
          {
            title: "Cumplimiento acuerdos",
            url: "/cobranza/reportes/cumplimiento-acuerdos",
            permisos: permisosDeReporte(REPORTE_KEY.cumplimientoAcuerdos),
          },
          {
            title: "Cartera sin gestión",
            url: "/cobranza/reportes/cartera-sin-gestion",
            permisos: permisosDeReporte(REPORTE_KEY.carteraSinGestion),
          },
          {
            title: "Margen por mandante",
            url: "/cobranza/reportes/margen-mandantes",
            permisos: permisosDeReporte(REPORTE_KEY.margenMandantes),
          },
          {
            title: "Comisiones vs proyección",
            url: "/cobranza/reportes/comisiones-vs-proyeccion",
            permisos: permisosDeReporte(REPORTE_KEY.comisionesVsProyeccion),
          },
          {
            title: "Ingreso por tramo",
            url: "/cobranza/reportes/ingreso-tramo-mora",
            permisos: permisosDeReporte(REPORTE_KEY.ingresoTramoMora),
          },
          {
            title: "Promesas de pago",
            url: "/cobranza/reportes/promesas-pago",
            permisos: permisosDeReporte(REPORTE_KEY.promesasPago),
          },
          {
            title: "Productividad diaria",
            url: "/cobranza/reportes/productividad-diaria",
            permisos: permisosDeReporte(REPORTE_KEY.productividadDiaria),
          },
          {
            title: "Recontactos",
            url: "/cobranza/reportes/recontactos",
            permisos: permisosDeReporte(REPORTE_KEY.recontactos),
          },
          {
            title: "SLA reclamos",
            url: "/cobranza/reportes/reclamos-sla",
            permisos: permisosDeReporte(REPORTE_KEY.reclamosSla),
          },
          {
            title: "Migración de mora",
            url: "/cobranza/reportes/migracion-mora",
            permisos: permisosDeReporte(REPORTE_KEY.migracionMora),
          },
          {
            title: "Concentración riesgo",
            url: "/cobranza/reportes/concentracion-riesgo",
            permisos: permisosDeReporte(REPORTE_KEY.concentracionRiesgo),
          },
          {
            title: "Cuotas vencidas",
            url: "/cobranza/reportes/cuotas-vencidas",
            permisos: permisosDeReporte(REPORTE_KEY.cuotasVencidas),
          },
          {
            title: "Cumplimiento metas",
            url: "/cobranza/reportes/cumplimiento-metas",
            permisos: permisosDeReporte(REPORTE_KEY.cumplimientoMetas),
          },
          {
            title: "Supervisor vs equipo",
            url: "/cobranza/reportes/supervisor-equipo",
            permisos: permisosDeReporte(REPORTE_KEY.supervisorEquipo),
          },
          {
            title: "Informe gerencial",
            url: "/cobranza/reportes/informe-gerencial",
            permisos: permisosDeReporte(REPORTE_KEY.informeGerencial),
          },
          {
            title: "Informe de gestiones",
            url: "/cobranza/reportes/informe-gestiones",
            permisos: permisosDeReporte(REPORTE_KEY.informeGestiones),
          },
        ],
      },
      {
        title: "Configuración",
        icon: Icons.Settings,
        permisos: [PERMISO.CONFIG_SYSTEM, PERMISO.USER_READ],
        items: [
          {
            title: "Sistema",
            url: "/configuracion",
            permiso: PERMISO.CONFIG_SYSTEM,
          },
          {
            title: "Auditoría",
            url: "/configuracion/auditoria",
            permiso: PERMISO.CONFIG_SYSTEM,
          },
          {
            title: "Cron operativo",
            url: "/configuracion/cron",
            permiso: PERMISO.CONFIG_SYSTEM,
          },
          {
            title: "Usuarios y permisos",
            url: "/configuracion/usuarios",
            permiso: PERMISO.USER_READ,
          },
        ],
      },
    ],
  },
];
