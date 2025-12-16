// Barrel export para mutations de catalogos
// Importar todas las mutations para que se registren en el builder
import "./tipo-documento.mutations";
import "./genero.mutations";
import "./estado-civil.mutations";
import "./ocupacion.mutations";
import "./tipo-persona.mutations";
import "./pais.mutations";
import "./departamento.mutations";

// Re-exportar para uso externo
export * from "./tipo-documento.mutations";
export * from "./genero.mutations";
export * from "./estado-civil.mutations";
export * from "./ocupacion.mutations";
export * from "./tipo-persona.mutations";
export * from "./pais.mutations";
export * from "./departamento.mutations";

