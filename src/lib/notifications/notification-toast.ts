import { notificationService } from "./notification-service";

export const notificationToast = {
  success: (message: string, title: string = "Éxito") => {
    notificationService.success(title, message);
  },
  error: (message: string, title: string = "Error") => {
    notificationService.error(title, message);
  },
  warning: (message: string, title: string = "Advertencia") => {
    notificationService.warning(title, message);
  },
  info: (message: string, title: string = "Información") => {
    notificationService.info(title, message);
  },
};

