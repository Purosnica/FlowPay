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
        icon: Icons.Calendar,
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
        permisos: [PERMISO.CARTERA_READ, PERMISO.GESTION_READ, PERMISO.CONCILIACION_VIEW, PERMISO.CIERRE_VIEW],
        items: [
          // Trabajo diario
          {
            title: "Mi bandeja",
            url: "/cobranza/bandeja",
            icon: Icons.Inbox,
            permiso: PERMISO.CARTERA_READ,
          },
          {
            title: "Mis gestiones",
            url: "/cobranza/gestiones",
            icon: Icons.ClipboardCheck,
            permiso: PERMISO.GESTION_READ,
          },
          {
            title: "Cartera",
            url: "/cobranza/cartera",
            icon: Icons.Wallet,
            permiso: PERMISO.CARTERA_READ,
          },
          {
            title: "Campañas",
            url: "/cobranza/campanas",
            icon: Icons.Megaphone,
            permiso: PERMISO.CARTERA_READ,
          },
          {
            title: "Wizard campaña",
            url: "/cobranza/campanas/wizard",
            icon: Icons.Wand,
            permiso: PERMISO.CARTERA_WRITE,
          },
          {
            title: "Reclamos",
            url: "/cobranza/reclamos",
            icon: Icons.MessageAlert,
            permiso: PERMISO.GESTION_READ,
          },
          // Supervisión
          {
            title: "Centro de Inteligencia",
            url: "/cobranza/centro-inteligencia",
            icon: Icons.Brain,
            permiso: PERMISO.INTELIGENCIA_READ,
          },
          {
            title: "Mi equipo",
            url: "/cobranza/equipo",
            icon: Icons.Users,
            permiso: PERMISO.EQUIPO_READ,
          },
          {
            title: "Gamificación",
            url: "/cobranza/gamificacion",
            icon: Icons.Trophy,
            permiso: PERMISO.EQUIPO_READ,
          },
          // Carga y asignación de cartera
          {
            title: "Mandantes",
            url: "/cobranza/mandantes",
            icon: Icons.Building,
            permiso: PERMISO.MANDANTE_READ,
          },
          {
            title: "Importar",
            url: "/cobranza/importar",
            icon: Icons.Upload,
            permiso: PERMISO.CARTERA_WRITE,
          },
          {
            title: "Historial cargas",
            url: "/cobranza/historial-cargas",
            icon: Icons.History,
            permiso: PERMISO.CARTERA_READ,
          },
          {
            title: "Asignación",
            url: "/cobranza/asignacion",
            icon: Icons.UserCheck,
            permiso: PERMISO.CARTERA_WRITE,
          },
          // Configuración operativa
          {
            title: "Plantillas",
            url: "/cobranza/plantillas",
            icon: Icons.LayoutTemplate,
            permiso: PERMISO.MANDANTE_READ,
          },
          {
            title: "Plantillas mensaje",
            url: "/cobranza/plantillas-mensaje",
            icon: Icons.MessageSquare,
            permiso: PERMISO.MANDANTE_WRITE,
          },
          {
            title: "Agencias",
            url: "/cobranza/agencias",
            icon: Icons.Landmark,
            permiso: PERMISO.CARTERA_READ,
          },
          // Cierre financiero
          {
            title: "Liquidaciones",
            url: "/cobranza/liquidaciones",
            icon: Icons.Receipt,
            permiso: PERMISO.LIQUIDACION_READ,
          },
          {
            title: "Conciliación bancaria",
            url: "/cobranza/conciliaciones",
            icon: Icons.Bank,
            permiso: PERMISO.CONCILIACION_VIEW,
          },
          {
            title: "Cierre diario",
            url: "/cobranza/cierres",
            icon: Icons.CalendarCheck,
            permiso: PERMISO.CIERRE_VIEW,
          },
        ],
      },
      {
        title: "Reportes",
        icon: Icons.Table,
        permisos: [...PERMISOS_REPORTE_CUALQUIERA],
        items: [
          {
            title: "Centro de reportes",
            url: "/cobranza/reportes",
            icon: Icons.ChartReport,
            permisos: permisosDeReporte(REPORTE_KEY.hub),
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
            icon: Icons.Server,
            permiso: PERMISO.CONFIG_SYSTEM,
          },
          {
            title: "Auditoría",
            url: "/configuracion/auditoria",
            icon: Icons.ShieldCheck,
            permiso: PERMISO.CONFIG_SYSTEM,
          },
          {
            title: "Cron operativo",
            url: "/configuracion/cron",
            icon: Icons.Clock,
            permiso: PERMISO.CONFIG_SYSTEM,
          },
          {
            title: "Usuarios y permisos",
            url: "/configuracion/usuarios",
            icon: Icons.UsersKey,
            permiso: PERMISO.USER_READ,
          },
          {
            title: "Catálogos de cobranza",
            url: "/configuracion/catalogos",
            icon: Icons.BookOpen,
            permiso: PERMISO.CONFIG_SYSTEM,
          },
        ],
      },
    ],
  },
];
