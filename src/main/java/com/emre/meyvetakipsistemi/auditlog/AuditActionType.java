package com.emre.meyvetakipsistemi.auditlog;

// Sistemde loglanacak işlem türlerini tutar.
public enum AuditActionType {

    USER_LOGIN("Kullanıcı giriş yaptı"),
    USER_LOGIN_FAILED("Kullanıcı giriş yapamadı"),
    USER_LOGOUT("Kullanıcı çıkış yaptı"),

    NEED_LIST_CREATED("İhtiyaç listesi oluşturuldu"),
    NEED_LIST_UPDATED("İhtiyaç listesi güncellendi"),
    NEED_LIST_DELETED("İhtiyaç listesi silindi"),

    PURCHASE_CREATED("Alım kaydı oluşturuldu"),
    PURCHASE_FAILED("Alım kaydı başarısız oldu"),
    COLLECTION_CREATED("Toplama kaydı oluşturuldu"),
    ACCEPTANCE_CREATED("Mal kabul kaydı oluşturuldu"),
    TASK_COMPLETED("Görev tamamlandı"),
    TASK_ASSIGNED("Görev atandı"),

    DELIVERY_PLAN_CREATED("Teslimat planı oluşturuldu"),
    DELIVERY_PLAN_CANCELLED("Teslimat planı iptal edildi"),

    /*
      Sistemin kendi yaptığı otomatik denetimler. Bir kullanıcı işlemi değildir:
      CONSISTENCY_CHECK, bir aşama kaydedilince miktarların tutarlılığını
      karşılaştıran otomatik kontroldür (bkz. ConsistencyCheckService).
      SYSTEM_CHECK ise arka planda çalışan zamanlanmış görev denetimidir
      (ör. süresi geçen görevlerin işaretlenmesi).
    */
    CONSISTENCY_CHECK("Miktar tutarlılık kontrolü yapıldı"),
    SYSTEM_CHECK("Sistem otomatik denetimi çalıştı");

    private final String description;

    AuditActionType(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}