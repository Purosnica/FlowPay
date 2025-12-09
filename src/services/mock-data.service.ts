/**
 * Servicio de datos mock para desarrollo y pruebas
 * Estos datos serán reemplazados por llamadas GraphQL reales
 */

// Simular delay de red
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockDataService = {
  async getOverviewData() {
    await delay(2000);
    return {
      views: {
        value: 3456,
        growthRate: 0.43,
      },
      profit: {
        value: 4220,
        growthRate: 4.35,
      },
      products: {
        value: 3456,
        growthRate: 2.59,
      },
      users: {
        value: 3456,
        growthRate: -0.95,
      },
    };
  },

  async getChatsData() {
    await delay(1000);
    return [
      {
        name: "Jacob Jones",
        profile: "/images/user/user-01.png",
        isActive: true,
        lastMessage: {
          content: "See you tomorrow at the meeting!",
          type: "text",
          timestamp: "2024-12-19T14:30:00Z",
          isRead: false,
        },
        unreadCount: 3,
      },
      {
        name: "Wilium Smith",
        profile: "/images/user/user-03.png",
        isActive: true,
        lastMessage: {
          content: "Thanks for the update",
          type: "text",
          timestamp: "2024-12-19T10:15:00Z",
          isRead: true,
        },
        unreadCount: 0,
      },
      {
        name: "Johurul Haque",
        profile: "/images/user/user-04.png",
        isActive: false,
        lastMessage: {
          content: "What's up?",
          type: "text",
          timestamp: "2024-12-19T10:15:00Z",
          isRead: true,
        },
        unreadCount: 0,
      },
      {
        name: "M. Chowdhury",
        profile: "/images/user/user-05.png",
        isActive: false,
        lastMessage: {
          content: "Where are you now?",
          type: "text",
          timestamp: "2024-12-19T10:15:00Z",
          isRead: true,
        },
        unreadCount: 2,
      },
      {
        name: "Akagami",
        profile: "/images/user/user-07.png",
        isActive: false,
        lastMessage: {
          content: "Hey, how are you?",
          type: "text",
          timestamp: "2024-12-19T10:15:00Z",
          isRead: true,
        },
        unreadCount: 0,
      },
    ];
  },

  async getDevicesUsedData(timeFrame?: "monthly" | "yearly" | (string & {})) {
    await delay(1000);
    const data = [
      {
        name: "Desktop",
        percentage: 0.65,
        amount: 1625,
      },
      {
        name: "Tablet",
        percentage: 0.1,
        amount: 250,
      },
      {
        name: "Mobile",
        percentage: 0.2,
        amount: 500,
      },
      {
        name: "Unknown",
        percentage: 0.05,
        amount: 125,
      },
    ];

    if (timeFrame === "yearly") {
      data[0].amount = 19500;
      data[1].amount = 3000;
      data[2].amount = 6000;
      data[3].amount = 1500;
    }

    return data;
  },

  async getPaymentsOverviewData(timeFrame?: "monthly" | "yearly" | (string & {})) {
    await delay(1000);

    if (timeFrame === "yearly") {
      return {
        received: [
          { x: 2020, y: 450 },
          { x: 2021, y: 620 },
          { x: 2022, y: 780 },
          { x: 2023, y: 920 },
          { x: 2024, y: 1080 },
        ],
        due: [
          { x: 2020, y: 1480 },
          { x: 2021, y: 1720 },
          { x: 2022, y: 1950 },
          { x: 2023, y: 2300 },
          { x: 2024, y: 1200 },
        ],
      };
    }

    return {
      received: [
        { x: "Jan", y: 0 },
        { x: "Feb", y: 20 },
        { x: "Mar", y: 35 },
        { x: "Apr", y: 45 },
        { x: "May", y: 35 },
        { x: "Jun", y: 55 },
        { x: "Jul", y: 65 },
        { x: "Aug", y: 50 },
        { x: "Sep", y: 65 },
        { x: "Oct", y: 75 },
        { x: "Nov", y: 60 },
        { x: "Dec", y: 75 },
      ],
      due: [
        { x: "Jan", y: 15 },
        { x: "Feb", y: 9 },
        { x: "Mar", y: 17 },
        { x: "Apr", y: 32 },
        { x: "May", y: 25 },
        { x: "Jun", y: 68 },
        { x: "Jul", y: 80 },
        { x: "Aug", y: 68 },
        { x: "Sep", y: 84 },
        { x: "Oct", y: 94 },
        { x: "Nov", y: 74 },
        { x: "Dec", y: 62 },
      ],
    };
  },

  async getWeeksProfitData(timeFrame?: string) {
    await delay(1000);

    if (timeFrame === "last week") {
      return {
        sales: [
          { x: "Sat", y: 33 },
          { x: "Sun", y: 44 },
          { x: "Mon", y: 31 },
          { x: "Tue", y: 57 },
          { x: "Wed", y: 12 },
          { x: "Thu", y: 33 },
          { x: "Fri", y: 55 },
        ],
        revenue: [
          { x: "Sat", y: 10 },
          { x: "Sun", y: 20 },
          { x: "Mon", y: 17 },
          { x: "Tue", y: 7 },
          { x: "Wed", y: 10 },
          { x: "Thu", y: 23 },
          { x: "Fri", y: 13 },
        ],
      };
    }

    return {
      sales: [
        { x: "Sat", y: 44 },
        { x: "Sun", y: 55 },
        { x: "Mon", y: 41 },
        { x: "Tue", y: 67 },
        { x: "Wed", y: 22 },
        { x: "Thu", y: 43 },
        { x: "Fri", y: 65 },
      ],
      revenue: [
        { x: "Sat", y: 13 },
        { x: "Sun", y: 23 },
        { x: "Mon", y: 20 },
        { x: "Tue", y: 8 },
        { x: "Wed", y: 13 },
        { x: "Thu", y: 27 },
        { x: "Fri", y: 15 },
      ],
    };
  },

  async getCampaignVisitorsData() {
    await delay(1000);
    return {
      total_visitors: 784_000,
      performance: -1.5,
      chart: [
        { x: "S", y: 168 },
        { x: "S", y: 385 },
        { x: "M", y: 201 },
        { x: "T", y: 298 },
        { x: "W", y: 187 },
        { x: "T", y: 195 },
        { x: "F", y: 291 },
      ],
    };
  },

  async getVisitorsAnalyticsData() {
    await delay(1000);
    return [
      168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 112, 123, 212, 270,
      190, 310, 115, 90, 380, 112, 223, 292, 170, 290, 110, 115, 290, 380, 312,
    ].map((value, index) => ({ x: index + 1 + "", y: value }));
  },

  async getCostsPerInteractionData() {
    return {
      avg_cost: 560.93,
      growth: 2.5,
      chart: [
        {
          name: "Google Ads",
          data: [
            { x: "Sep", y: 15 },
            { x: "Oct", y: 12 },
            { x: "Nov", y: 61 },
            { x: "Dec", y: 118 },
            { x: "Jan", y: 78 },
            { x: "Feb", y: 125 },
            { x: "Mar", y: 165 },
            { x: "Apr", y: 61 },
            { x: "May", y: 183 },
            { x: "Jun", y: 238 },
            { x: "Jul", y: 237 },
            { x: "Aug", y: 235 },
          ],
        },
        {
          name: "Facebook Ads",
          data: [
            { x: "Sep", y: 75 },
            { x: "Oct", y: 77 },
            { x: "Nov", y: 151 },
            { x: "Dec", y: 72 },
            { x: "Jan", y: 7 },
            { x: "Feb", y: 58 },
            { x: "Mar", y: 60 },
            { x: "Apr", y: 185 },
            { x: "May", y: 239 },
            { x: "Jun", y: 135 },
            { x: "Jul", y: 119 },
            { x: "Aug", y: 124 },
          ],
        },
      ],
    };
  },
};
