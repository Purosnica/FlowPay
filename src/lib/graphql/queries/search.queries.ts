// ======================================================
// QUERIES PARA BÚSQUEDA GLOBAL
// ======================================================

export const BUSCAR_GLOBAL = /* GraphQL */ `
  query BuscarGlobal($query: String!, $limite: Int) {
    buscarGlobal(query: $query, limite: $limite) {
      total
      clientes {
        tipo
        id
        codigo
        nombre
        subtitulo
        metadata
      }
      prestamos {
        tipo
        id
        codigo
        nombre
        subtitulo
        metadata
      }
    }
  }
`;



