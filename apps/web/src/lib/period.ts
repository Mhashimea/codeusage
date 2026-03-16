export type Period = "7d" | "30d" | "this_month";

export function getPeriodDates(period: Period): { startDate: Date; label: string } {
  const now = new Date();

  switch (period) {
    case "7d": {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      return { startDate, label: "Last 7 days" };
    }
    case "30d": {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      return { startDate, label: "Last 30 days" };
    }
    case "this_month": {
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate, label: "This month" };
    }
    default: {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      return { startDate, label: "Last 30 days" };
    }
  }
}
