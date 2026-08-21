package com.emre.meyvetakipsistemi.task.dto;

import com.emre.meyvetakipsistemi.task.TaskStatus;
import com.emre.meyvetakipsistemi.task.TaskType;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/*
  Kullanıcıya atanmış tek bir görevin dışarı açılan bilgileri.

  Frontend bu alanları "Aktif Görevler" ekranında kullanır:
  görev türü ve durumu rozetlerde, dueDate ise canlı geri sayım
  sayacında (bkz. components/CountdownText.js).
*/
@Getter
@AllArgsConstructor
public class TaskAssignmentResponse {

    private Long id;

    /*
      Görevin ait olduğu plan; tüm aşamalar bu numarayla birbirine bağlanır.
      GENEL (müdürün elle atadığı) görevlerde BOŞ gelir - frontend bu alanı
      göstermeden önce dolu olup olmadığını kontrol etmelidir.
    */
    private Long planId;

    private Long assignedUserId;

    private LocalDateTime assignedAt;

    // Son teslim zamanı. Bozulabilir ürün varsa 2, yoksa 4 saat sonrası
    // (bkz. TaskDeadlineCalculator).
    private LocalDateTime dueDate;

    // ALIM, TOPLAMA, TESLIMAT, ACCEPTANCE, GENEL
    private TaskType taskType;

    // PENDING, IN_PROGRESS, COMPLETED, OVERDUE
    private TaskStatus status;

    /*
      Görevin açıklaması. Yalnızca GENEL görevlerde doludur (örn. "Depo
      temizliği"); akış görevlerinde ne yapılacağı taskType'tan bellidir ve
      bu alan boş gelir.
    */
    private String title;
}
