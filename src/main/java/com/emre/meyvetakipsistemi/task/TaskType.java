package com.emre.meyvetakipsistemi.task;
// ALIM: müdürün alım yapması gereken görev. TOPLAMA: şoförün hale gidip toplama/alım yapması
// gereken görev (frontend'de "Alım Görevi" olarak gösterilir). TESLIMAT: TOPLAMA tamamlandıktan
// sonra aynı şoföre otomatik atanan, topladığı ürünleri mağazaya fiziksel olarak teslim etme görevi.
public enum TaskType { ACCEPTANCE, ALIM, TOPLAMA, TESLIMAT }
