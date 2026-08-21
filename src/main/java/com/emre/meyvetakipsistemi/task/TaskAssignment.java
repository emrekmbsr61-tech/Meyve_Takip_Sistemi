package com.emre.meyvetakipsistemi.task;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
@Entity @Table(name = "task_assignments") @Getter @Setter
public class TaskAssignment {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

 /*
   Görevin ait olduğu ihtiyaç planı.

   BOŞ (null) OLABİLİR: yalnızca akış görevleri (ALIM/TOPLAMA/TESLIMAT/ACCEPTANCE)
   bir plana bağlıdır. Müdürün elle oluşturduğu GENEL görevlerin planı yoktur.
   Bu yüzden planId'yi okuyan her yer null ihtimalini hesaba katmalıdır
   (bkz. OverdueTaskScheduler ve frontend görev kartları).
 */
 private Long planId;

 private Long assignedUserId; private LocalDateTime assignedAt = LocalDateTime.now(); private LocalDateTime dueDate = LocalDateTime.now().plusHours(8);

 /*
   Görevin açıklaması (örn. "Depo temizliği").
   Yalnızca GENEL görevlerde doludur; akış görevlerinde ne yapılacağı zaten
   taskType'tan bellidir, bu alan onlarda boş kalır.
 */
 @Column(length = 200) private String title;

 /*
   Görevi ATAYAN müdürün id'si. Yalnızca GENEL görevlerde doludur; akış
   görevlerini sistem otomatik oluşturduğu için orada boş kalır.
   Görev tamamlandığında müdüre haber verebilmek için gereklidir.
 */
 private Long assignedBy;

 /*
   Görevin tamamlandığı an. Yalnızca GENEL görevlerde doldurulur
   (bkz. TaskAssignmentService.completeManualTask) ve "Tamamlanan İşlemler"
   ekranında hem sıralama hem "zamanında mı bitti" karşılaştırması için kullanılır.
 */
 private LocalDateTime completedAt;

 @Enumerated(EnumType.STRING) private TaskType taskType = TaskType.ACCEPTANCE;
 @Enumerated(EnumType.STRING) private TaskStatus status = TaskStatus.PENDING;
}
