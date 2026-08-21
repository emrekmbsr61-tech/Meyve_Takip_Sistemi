package com.emre.meyvetakipsistemi.task.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/*
  "Tamamlanan İşlemler" ekranında gösterilecek, tamamlanmış tek bir serbest
  görev (bkz. TaskType.GENEL).

  Yalnızca ekranda gerçekten gösterilen alanlar taşınır. Kullanıcı id'leri
  yerine doğrudan ADLARI gönderilir; böylece frontend ayrıca kullanıcı
  sorgulamak zorunda kalmaz.
*/
@Getter
@AllArgsConstructor
public class CompletedTaskResponse {

    private Long id;

    // Görevin ne olduğu, örn. "Depo temizliği".
    private String title;

    // Görevi yapan personelin adı.
    private String assigneeName;

    // Görevi atayan müdürün adı.
    private String assignedByName;

    // Verilen son teslim zamanı.
    private LocalDateTime dueDate;

    // Görevin gerçekten tamamlandığı an.
    private LocalDateTime completedAt;

    /*
      Görev süresi geçtikten SONRA mı tamamlandı?
      Karşılaştırma backend'de yapılır ki aynı kural her yerde tek olsun;
      frontend yalnızca rozeti gösterir.
    */
    private boolean completedLate;
}
