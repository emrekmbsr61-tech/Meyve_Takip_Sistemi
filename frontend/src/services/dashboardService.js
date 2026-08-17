import { apiRequest } from "./httpClient";

/*
  Ana ekrandaki özet istatistikleri backend'den getirir.
  Endpoint: GET /api/dashboard  (bkz. backend DashboardController)

  Dönen alanlar:
    totalFruitCount, todayPurchaseTotal, lastSevenDaysPurchaseTotal,
    activePlanCount, activeTaskCount, overdueTaskCount,
    criticalIssueCount, warningIssueCount, recentIssues[]
*/
export async function getDashboard() {
  return await apiRequest("/dashboard");
}
