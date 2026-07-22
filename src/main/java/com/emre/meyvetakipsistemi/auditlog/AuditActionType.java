package com.emre.meyvetakipsistemi.auditlog;

// Sistemde loglanacak işlem türlerini tutar.
public enum AuditActionType {

    USER_LOGIN("Kullanıcı giriş yaptı"),
    USER_LOGIN_FAILED("Kullanıcı giriş yapamadı"),

    NEED_LIST_CREATED("İhtiyaç listesi oluşturuldu"),
    NEED_LIST_UPDATED("İhtiyaç listesi güncellendi"),
    NEED_LIST_DELETED("İhtiyaç listesi silindi");

    private final String description;

    AuditActionType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}