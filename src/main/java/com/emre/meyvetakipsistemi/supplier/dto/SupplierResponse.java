package com.emre.meyvetakipsistemi.supplier.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

/*
  Alım ekranında seçilebilecek bir tedarikçinin dışarı açılan bilgileri.

  Entity'deki address ve phone alanları BİLİNÇLİ olarak taşınmaz: alım
  ekranında kullanılmıyorlar ve gereksiz yere iletişim bilgisi yaymanın
  anlamı yok. İhtiyaç olursa buraya eklenir.
*/
@Getter
@AllArgsConstructor
public class SupplierResponse {

    private Long id;

    // Ekranda "4 - Ahmet Ticaret" biçiminde gösterilen kısa kod.
    private String supplierCode;

    private String supplierName;

    // Tedarikçinin bulunduğu hal/pazar adı.
    private String marketName;
}
