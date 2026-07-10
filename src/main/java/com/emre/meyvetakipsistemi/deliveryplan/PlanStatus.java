package com.emre.meyvetakipsistemi.deliveryplan;

/*
 * DeliveryPlan durumlarını temsil eder.
 *
 * CREATED: Plan oluşturuldu.
 * IN_PROGRESS: Plan süreci devam ediyor.
 * COMPLETED: Plan sorunsuz tamamlandı.
 * COMPLETED_WITH_WARNING: Plan tamamlandı ancak miktar farkı veya gecikme gibi uyarılar var.
 * CANCELLED: Plan iptal edildi.
 */

public enum PlanStatus {
    CREATED,
    IN_PROGRESS,
    COMPLETED,
    COMPLETED_WITH_WARNING,
    CANCELLED
}
