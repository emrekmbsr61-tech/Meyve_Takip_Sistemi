package com.emre.meyvetakipsistemi.dashboard;

import com.emre.meyvetakipsistemi.dashboard.dto.DashboardResponse;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/*
  Ana ekrandaki özet istatistikleri döner.
  Giriş yapmış her kullanıcı çağırabilir; hangi kartların gösterileceğine
  frontend rol bazında karar verir (bkz. Home ekranı).
*/
@RestController
@RequestMapping("/api/dashboard")
@CrossOrigin(origins = "*")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public DashboardResponse getDashboard() {
        return dashboardService.getDashboard();
    }
}
