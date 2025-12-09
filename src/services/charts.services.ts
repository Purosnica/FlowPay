import { mockDataService } from "./mock-data.service";

// Re-exportar desde el servicio consolidado
export const getDevicesUsedData = mockDataService.getDevicesUsedData;
export const getPaymentsOverviewData = mockDataService.getPaymentsOverviewData;
export const getWeeksProfitData = mockDataService.getWeeksProfitData;
export const getCampaignVisitorsData = mockDataService.getCampaignVisitorsData;
export const getVisitorsAnalyticsData = mockDataService.getVisitorsAnalyticsData;
export const getCostsPerInteractionData = mockDataService.getCostsPerInteractionData;