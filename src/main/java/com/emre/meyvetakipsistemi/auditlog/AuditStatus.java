package com.emre.meyvetakipsistemi.auditlog;

/*
  Bir log kaydının önem derecesidir.

  Şartnamede AuditLog'un yalnızca "ne oldu" değil, "bu iyi mi kötü mü"
  bilgisini de taşıması isteniyor. Özellikle tutarlılık (hırsızlık/kayıp)
  kontrolleri bu seviyelerle kaydedilir - bkz. ConsistencyCheckService.

  SUCCESS  : İşlem normal tamamlandı, miktarlar tutarlı.
  WARNING  : Dikkat edilmesi gereken bir fark var (ör. eksik sipariş).
  ERROR    : Sonucu bozan bir fark var (ör. mağaza ihtiyacı karşılanmadı).
  CRITICAL : Kayıp/hırsızlık şüphesi (ör. alınan ile toplanan tutmuyor).
*/
public enum AuditStatus {
    SUCCESS,
    WARNING,
    ERROR,
    CRITICAL
}
