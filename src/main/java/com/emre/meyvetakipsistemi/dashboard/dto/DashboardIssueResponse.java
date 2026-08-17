package com.emre.meyvetakipsistemi.dashboard.dto;

import com.emre.meyvetakipsistemi.auditlog.AuditStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

// Ana ekranda listelenen tek bir tutarsızlık uyarısını taşır.
@Getter
@AllArgsConstructor
public class DashboardIssueResponse {

    private Long planId;

    // WARNING / ERROR / CRITICAL
    private AuditStatus status;

    // Kullanıcıya gösterilecek tam açıklama.
    private String message;

    /*
      Bulgunun sayısal ayrıntısı (JSON metni): hangi ürün, hangi aşama, kaç
      birim fark var. Özet ekranı bunu okuyup uyarıyı sade bir başlık halinde
      gösterir; okunamazsa message alanına düşer (bkz. frontend Dashboard).
    */
    private String details;

    private LocalDateTime createdAt;
}
