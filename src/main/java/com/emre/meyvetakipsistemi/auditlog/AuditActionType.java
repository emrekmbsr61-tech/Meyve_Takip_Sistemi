package com.emre.meyvetakipsistemi.auditlog;

// Sistemde loglanacak işlem türlerini tutar.
public enum AuditActionType {

    USER_LOGIN("Kullanıcı giriş yaptı"),
    USER_LOGIN_FAILED("Kullanıcı giriş yapamadı"),

    NEED_LIST_CREATED("İhtiyaç listesi oluşturuldu"),
    NEED_LIST_UPDATED("İhtiyaç listesi güncellendi"),
    NEED_LIST_DELETED("İhtiyaç listesi silindi"),

    PURCHASE_CREATED("Alım kaydı oluşturuldu"),
    PURCHASE_FAILED("Alım kaydı başarısız oldu"),
    TASK_COMPLETED("Görev tamamlandı"),
    TASK_ASSIGNED("Görev atandı"),

    DELIVERY_PLAN_CREATED("Teslimat planı oluşturuldu"),
    DELIVERY_PLAN_CANCELLED("Teslimat planı iptal edildi");

    private final String description;

    AuditActionType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}