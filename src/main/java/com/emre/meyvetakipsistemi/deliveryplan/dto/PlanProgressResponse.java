package com.emre.meyvetakipsistemi.deliveryplan.dto;

import com.emre.meyvetakipsistemi.task.TaskType;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/*
  "Devam Eden İşlemler" ekranında gösterilecek tek bir planın DURUMU.

  Sorduğu soru şudur: "Bu mal şu an nerede?" Cevabı stage alanıdır - plan
  sırasıyla ALIM -> TOPLAMA -> TESLIMAT -> ACCEPTANCE aşamalarından geçer ve
  burada TAMAMLANMAMIŞ ilk aşama gösterilir.

  PlanSummary'den farkı: orası biten bir planın miktar karşılaştırmasıdır
  (geçmişe bakar). Burası devam eden bir planın nerede beklediğidir (şu ana bakar).
*/
@Getter
@AllArgsConstructor
public class PlanProgressResponse {

    private Long planId;

    private String storeName;

    // Plandaki ürün sayısı.
    private int itemCount;

    // Planın şu an beklediği aşama. Filtreleme bu alana göre yapılır.
    private TaskType stage;

    // Ekranda gösterilecek Türkçe aşama adı, örn. "Şoför topluyor".
    private String stageLabel;

    // O aşamadan sorumlu kişinin adı; görev henüz atanmamışsa boş olabilir.
    private String assigneeName;

    // O aşamanın son teslim zamanı; görev henüz atanmamışsa boş olabilir.
    private LocalDateTime dueDate;

    // Süresi geçmiş mi? Karşılaştırma backend'de yapılır ki kural tek yerde olsun.
    private boolean overdue;

    private LocalDateTime createdDate;
}
