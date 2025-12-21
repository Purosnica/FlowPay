/**
 * SERVICIO DE NOTIFICACIONES
 * 
 * Servicio centralizado para mostrar notificaciones al usuario.
 * Soporta diferentes tipos: success, error, warning, info.
 */

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number; // Duración en ms, undefined = no auto-close
}

type NotificationListener = (notification: Notification) => void;

class NotificationService {
  private listeners: NotificationListener[] = [];
  private notificationId = 0;

  /**
   * Suscribirse a notificaciones
   */
  subscribe(listener: NotificationListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Mostrar notificación
   */
  private notify(notification: Omit<Notification, "id">) {
    const id = `notification-${++this.notificationId}`;
    const fullNotification: Notification = {
      ...notification,
      id,
    };

    this.listeners.forEach((listener) => listener(fullNotification));
  }

  /**
   * Mostrar notificación de éxito
   */
  success(title: string, message?: string, duration?: number) {
    this.notify({
      type: "success",
      title,
      message: message || "",
      duration: duration ?? 3000,
    });
  }

  /**
   * Mostrar notificación de error
   */
  error(title: string, message?: string, duration?: number) {
    this.notify({
      type: "error",
      title,
      message: message || "",
      duration: duration ?? 5000, // Errores se muestran más tiempo
    });
  }

  /**
   * Mostrar notificación de advertencia
   */
  warning(title: string, message?: string, duration?: number) {
    this.notify({
      type: "warning",
      title,
      message: message || "",
      duration: duration ?? 4000,
    });
  }

  /**
   * Mostrar notificación informativa
   */
  info(title: string, message?: string, duration?: number) {
    this.notify({
      type: "info",
      title,
      message: message || "",
      duration: duration ?? 3000,
    });
  }
}

export const notificationService = new NotificationService();




