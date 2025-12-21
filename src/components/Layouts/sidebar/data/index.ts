import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Dashboard",
        icon: Icons.HomeIcon,       
        url: "/dashboard",
      },
      {
        title: "Clientes",
        url: "/clientes",
        icon: Icons.User,
        items: [],
      },
      {
        title: "Préstamos",
        icon: Icons.Table,
        items: [
          {
            title: "Listado",
            url: "/prestamos",
          },
          {
            title: "Crear préstamo",
            url: "/prestamos/nuevo",
          },
        ],
      },
      {
        title: "Pagos",
        icon: Icons.Calendar,
        items: [
          {
            title: "Registrar pago",
            url: "/pagos/registrar",
          },
        ],
      },
      {
        title: "Cartera",
        icon: Icons.PieChart,
        url: "/cartera",
        items: [],
      },
      {
        title: "Reportes",
        icon: Icons.PieChart,
        url: "/reportes",
        items: [],
      },
      {
        title: "Configuración",
        icon: Icons.Settings,
        url: "/configuracion",
        items: [],
      },
      {
        title: "Profile",
        url: "/profile",
        icon: Icons.User,
        items: [],
      },
      
      {
        title: "Pages",
        icon: Icons.Alphabet,
        items: [
          {
            title: "Settings",
            url: "/pages/settings",
          },
        ],
      },
    ],
  },
  {
    label: "OTHERS",
    items: [
      {
        title: "Charts",
        icon: Icons.PieChart,
        items: [
          {
            title: "Basic Chart",
            url: "/charts/basic-chart",
          },
        ],
      },
      
      {
        title: "Authentication",
        icon: Icons.Authentication,
        items: [
          {
            title: "Sign In",
            url: "/auth/sign-in",
          },
        ],
      },
    ],
  },
];
