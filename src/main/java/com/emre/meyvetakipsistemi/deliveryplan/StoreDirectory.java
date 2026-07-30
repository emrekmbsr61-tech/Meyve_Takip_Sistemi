package com.emre.meyvetakipsistemi.deliveryplan;

import java.util.Map;

/*
  Mağaza id -> ad eşlemesi. frontend/src/config/stores.js dosyasındaki listeyle
  BİREBİR aynı tutulmalıdır. Yalnızca GÖRÜNTÜLEME (ekranda mağaza adı gösterme)
  amaçlıdır; yeni plan oluşturma veya planId üretme akışında KESİNLİKLE KULLANILMAZ.

  DeliveryPlan tablosu hiç kullanılmadan önceki eski sistemde her mağazanın planId'si
  kendi id'sine eşitti (frontend/src/config/stores.js dosyasının git geçmişindeki
  eski hâlinde, id ve planId alanları her satırda aynıydı). Bu yüzden aynı harita,
  DeliveryPlan kaydı bulunamayan eski/legacy NeedList satırları için de (yalnızca
  görüntüleme amacıyla) legacy planId -> mağaza adı eşlemesi olarak kullanılır
  (bkz. DeliveryPlanService.resolveStoreInfo).
*/
final class StoreDirectory {

    private StoreDirectory() {
    }

    private static final Map<String, String> NAMES_BY_STORE_ID = Map.ofEntries(
            Map.entry("1", "Merkez Şube"),
            Map.entry("2", "Kadıköy Şubesi"),
            Map.entry("3", "Beşiktaş Şubesi"),
            Map.entry("4", "Üsküdar Şubesi"),
            Map.entry("5", "Ataşehir Şubesi"),
            Map.entry("6", "Bakırköy Şubesi"),
            Map.entry("7", "Şişli Şubesi"),
            Map.entry("8", "Maltepe Şubesi"),
            Map.entry("9", "Kartal Şubesi"),
            Map.entry("10", "Beylikdüzü Şubesi")
    );

    static String nameOf(String storeId) {
        return storeId == null ? null : NAMES_BY_STORE_ID.get(storeId);
    }
}
