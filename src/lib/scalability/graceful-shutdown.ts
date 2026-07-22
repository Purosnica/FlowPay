/**
 * Señal de apagado gracioso para crons/workers HTTP (I035).
 * En serverless el proceso puede cortar; permite salir de bucles limpios.
 */

let shuttingDown = false;

export function markShuttingDown(): void {
  shuttingDown = true;
}

export function isShuttingDown(): boolean {
  return shuttingDown;
}

export function resetShuttingDownForTests(): void {
  shuttingDown = false;
}

/** Registra SIGTERM/SIGINT una sola vez (procesos Node largos / scripts). */
let handlersRegistered = false;

export function registerGracefulShutdownHandlers(): void {
  if (handlersRegistered || typeof process === 'undefined') {
    return;
  }
  handlersRegistered = true;
  const onSignal = (): void => {
    markShuttingDown();
  };
  process.on('SIGTERM', onSignal);
  process.on('SIGINT', onSignal);
}
