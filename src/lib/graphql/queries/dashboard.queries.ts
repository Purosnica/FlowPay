// ======================================================
// QUERIES PARA DASHBOARD AVANZADO
// ======================================================

export const GET_DASHBOARD_KPIS = /* GraphQL */ `
  query DashboardKPIs($idusuario: Int) {
    dashboardKPIs(idusuario: $idusuario) {
      totalPrestado
      totalRecuperado
      carteraActiva
      carteraVencida
      moraPromedio
      promesasVencidasHoy
      prestamosUltimos30Dias
    }
  }
`;

export const GET_PRESTAMOS_ULTIMOS_30_DIAS = /* GraphQL */ `
  query PrestamosUltimos30Dias($idusuario: Int) {
    prestamosUltimos30Dias(idusuario: $idusuario) {
      total
      montoTotal
      items {
        fecha
        cantidad
        montoTotal
      }
    }
  }
`;

export const GET_PROMESAS_VENCIDAS_HOY = /* GraphQL */ `
  query PromesasVencidasHoy($idusuario: Int) {
    promesasVencidasHoy(idusuario: $idusuario) {
      total
      montoTotal
      items {
        idpromesa
        idprestamo
        codigoPrestamo
        cliente
        fechaPromesa
        montoCompromiso
        diasVencidos
        gestor
      }
    }
  }
`;

export const GET_RANKING_GESTORES_DASHBOARD = /* GraphQL */ `
  query RankingGestores($filters: ReporteFiltersInput, $idusuario: Int) {
    rankingGestores(filters: $filters, idusuario: $idusuario) {
      periodo
      items {
        idusuario
        nombre
        email
        cantidadPrestamos
        montoTotal
        montoRecuperado
        porcentajeRecuperacion
        moraPromedio
        posicion
      }
    }
  }
`;



