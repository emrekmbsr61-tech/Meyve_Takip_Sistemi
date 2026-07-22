package com.emre.meyvetakipsistemi.auditlog;

import org.springframework.data.jpa.repository.JpaRepository;

// AuditLog tablosu için veritabanı işlemlerini yapar.
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
}