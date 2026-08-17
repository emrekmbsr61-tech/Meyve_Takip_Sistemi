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

    /*
      İşlemin ait olduğu planın id bilgisidir. Aynı planId'ye sahip tüm kayıtlar
      (NeedList, Purchase, Collection, Acceptance) birbiriyle ilişkilidir; bu alan
      sayesinde admin log ekranında "şu plana ait tüm hareketler" filtrelenebilir.
      Plana bağlı olmayan işlemlerde (ör. kullanıcı girişi) null kalır.
    */
    private Long planId;

    /*
      İşlemin önem derecesidir (bkz. AuditStatus). Varsayılan SUCCESS'tir;
      tutarlılık kontrolleri WARNING/ERROR/CRITICAL değerlerini kullanır.
    */
    @Enumerated(EnumType.STRING)
    private AuditStatus status = AuditStatus.SUCCESS;

    /*
      Ek bilgiler (JSON metni). Örneğin bir tutarlılık kontrolünde hangi üründe
      ne kadar fark bulunduğu burada saklanır. Uzun olabileceği için TEXT sütunu
      olarak tutulur.
    */
    @Column(columnDefinition = "TEXT")
    private String details;

    // İnsan tarafından okunabilir açıklama bilgisidir.
    private String description;

    // İşlemin yapılma zamanıdır.
    private LocalDateTime createdAt = LocalDateTime.now();
}