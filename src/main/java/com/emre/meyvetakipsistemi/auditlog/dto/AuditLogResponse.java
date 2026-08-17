package com.emre.meyvetakipsistemi.auditlog.dto;

import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/*
  Admin log ekranına gönderilen tek bir log satırıdır.
  AuditLog entity'si doğrudan dışarı açılmaz; frontend'in ihtiyacı olan
  alanlar buraya kopyalanır (bkz. AuditLogService.getAllLogs).
*/
@Getter
@AllArgsConstructor
public class AuditLogResponse {

    private Long id;

    private Long userId;

    private String userFullName;

    private AuditActionType actionType;

    private String entityType;

    private Long entityId;

    // Kayıt hangi plana ait (plana bağlı olmayan işlemlerde null).
    private Long planId;

    // Olayın önem derecesi: SUCCESS / WARNING / ERROR / CRITICAL.
    private AuditStatus status;

    // Ek bilgiler, JSON metni (ör. miktar farkları). Yoksa null.
    private String details;

    private String description;

    private LocalDateTime createdAt;
}
