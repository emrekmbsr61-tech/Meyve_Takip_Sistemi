package com.emre.meyvetakipsistemi.task.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/*
  Müdürün elle görev atarken gönderdiği istektir.

  Dikkat: burada planId YOKTUR ve bilinçli olarak istenmez - bu görevler bir
  ihtiyaç planına bağlı değildir (bkz. TaskType.GENEL).

  Alanların hiçbiri boş bırakılamaz: kime, ne yapacağı ve ne kadar sürede
  belirtilmeden görev oluşturulamaz. Kontroller anotasyonlarla yapılır, istek
  Service'e ulaşmadan reddedilir (bkz. Controller'daki @Valid).
*/
@Getter
@Setter
public class CreateTaskRequest {

    // Görevi atayan müdürün kimliği; yetki kontrolü için gereklidir.
    @NotNull(message = "Kullanıcı kimliği gereklidir")
    private Long managerId;

    // Görevin atanacağı personel.
    @NotNull(message = "Görev atanacak kişi seçilmelidir")
    private Long assignedUserId;

    // Ne yapılacağı, örn. "Depo temizliği".
    @NotBlank(message = "Görev açıklaması boş olamaz")
    @Size(max = 200, message = "Görev açıklaması en fazla 200 karakter olabilir")
    private String title;

    /*
      Görevin kaç saat içinde tamamlanması gerektiği.
      Son teslim zamanı backend'de hesaplanır (şu an + bu süre); client'tan
      hazır bir tarih kabul edilmez, aksi halde geçmiş bir tarih gönderilebilirdi.
    */
    @NotNull(message = "Süre seçilmelidir")
    @Positive(message = "Süre sıfırdan büyük olmalıdır")
    @Max(value = 72, message = "Süre en fazla 72 saat olabilir")
    private Integer durationHours;
}
