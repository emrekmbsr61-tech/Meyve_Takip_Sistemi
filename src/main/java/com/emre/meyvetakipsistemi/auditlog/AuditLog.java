package com.emre.meyvetakipsistemi.auditlog;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// Sistemde yapılan işlemlerin kaydını tutar.
@Entity
@Table(name = "audit_logs")
@Getter
@Setter
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // İşlemi yapan kullanıcının id bilgisidir.
    private Long userId;

    // İşlemi yapan kullanıcının ad soyad bilgisidir.
    private String userFullName;

    // Yapılan işlemin türüdür.
    @Enumerated(EnumType.STRING)
    private AuditActionType actionType;

    // İşlemin hangi tablo/modül üzerinde yapıldığını belirtir.
    private String entityType;

    // İşlem yapılan kaydın id bilgisidir.
    private Long entityId;

    // İnsan tarafından okunabilir açıklama bilgisidir.
    private String description;

    // İşlemin yapılma zamanıdır.
    private LocalDateTime createdAt = LocalDateTime.now();
}