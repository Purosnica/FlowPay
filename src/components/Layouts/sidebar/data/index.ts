import * as Icons from "../icons";
import type { NavSection } from "@/lib/navigation/filter-nav-by-permisos";
import { PERMISO } from "@/lib/permissions/permiso-codes";

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
            title: "Reportes",
            url: "/cobranza/reportes",
            permiso: PERMISO.REPORTE_READ,
          },
          {
            title: "Informe gerencial",
            url: "/cobranza/informe-gerencial",
            permiso: PERMISO.REPORTE_READ,
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
