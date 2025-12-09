import { mockDataService } from "@/services/mock-data.service";

// Re-exportar desde el servicio consolidado
export const getOverviewData = mockDataService.getOverviewData;
export const getChatsData = mockDataService.getChatsData;