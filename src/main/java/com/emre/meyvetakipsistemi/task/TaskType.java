package com.emre.meyvetakipsistemi.task;
// ALIM: müdürün alım yapması gereken görev. TOPLAMA: şoförün hale gidip toplama/alım yapması
// gereken görev (frontend'de "Alım Görevi" olarak gösterilir). TESLIMAT: TOPLAMA tamamlandıktan
// sonra aynı şoföre otomatik atanan, topladığı ürünleri mağazaya fiziksel olarak teslim etme görevi.
//
// GENEL: yukarıdakilerin hiçbirine girmeyen, MÜDÜRÜN ELLE oluşturduğu serbest görev
// (örn. "Depo temizliği"). Diğerlerinden iki farkı vardır:
//   1) Bir ihtiyaç planına bağlı DEĞİLDİR -> TaskAssignment.planId boş (null) kalır.
//   2) Ne yapılacağı sabit değildir -> açıklaması TaskAssignment.title alanında tutulur.
public enum TaskType { ACCEPTANCE, ALIM, TOPLAMA, TESLIMAT, GENEL }
