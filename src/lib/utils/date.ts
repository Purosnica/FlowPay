/**
 * Utilidades para manejo de fechas
 */

/**
 * Formatea un timestamp de mensaje a formato relativo
 */
export function formatMessageTime(timestamp: string): string {
  const messageDate = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - messageDate.getTime()) / (60 * 1000)
  );
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  // Para mensajes de hoy, mostrar hora
  if (diffInDays === 0) {
    // Si menos de 60 minutos, mostrar "X min"
    if (diffInMinutes < 60) {
      return diffInMinutes === 0 ? "just now" : `${diffInMinutes}m`;
    }
    // De lo contrario mostrar hora como "4:39 PM"
    return messageDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // Para mensajes de esta semana, mostrar día
  if (diffInDays < 7) {
    return messageDate.toLocaleDateString("en-US", { weekday: "long" });
  }

  // Para mensajes de este año, mostrar fecha
  if (messageDate.getFullYear() === now.getFullYear()) {
    return messageDate.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });
  }

  // Para mensajes más antiguos, mostrar fecha con año
  return messageDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Verifica si una fecha está vencida
 */
export function isFechaVencida(fecha: Date): boolean {
  const ahora = new Date();
  ahora.setHours(0, 0, 0, 0);
  const fechaComparar = new Date(fecha);
  fechaComparar.setHours(0, 0, 0, 0);
  return fechaComparar < ahora;
}

/**
 * Calcula la diferencia en días entre dos fechas
 */
export function diferenciaEnDias(fechaInicio: Date, fechaFin: Date): number {
  const inicio = new Date(fechaInicio);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(fechaFin);
  fin.setHours(0, 0, 0, 0);
  const diffTime = fin.getTime() - inicio.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

