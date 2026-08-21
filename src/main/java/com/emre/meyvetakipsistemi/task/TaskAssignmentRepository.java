package com.emre.meyvetakipsistemi.task;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
public interface TaskAssignmentRepository extends JpaRepository<TaskAssignment, Long> {
 List<TaskAssignment> findByAssignedUserIdOrderByDueDateAsc(Long assignedUserId);
 // Süresi geçmiş ama hâlâ tamamlanmamış görevleri bulur (bkz. OverdueTaskScheduler).
 List<TaskAssignment> findByStatusInAndDueDateBefore(List<TaskStatus> statuses, LocalDateTime deadline);
 Optional<TaskAssignment> findByPlanIdAndAssignedUserIdAndTaskType(Long planId, Long assignedUserId, TaskType taskType);
 // Bir planın belirli türdeki görevini (kullanıcıdan bağımsız) bulmak için kullanılır.
 // Purchase tamamlanınca ALIM görevini bulup COMPLETED yapmak ve aynı plan için
 // ikinci bir TOPLAMA görevi oluşturulmadığını kontrol etmek amacıyla kullanılır.
 Optional<TaskAssignment> findByPlanIdAndTaskType(Long planId, TaskType taskType);

 // Bir planın BÜTÜN görevleri. "Devam Eden İşlemler" ekranı, planın hangi
 // aşamada olduğunu bu listeye bakarak belirler (bkz. PlanProgressService).
 List<TaskAssignment> findByPlanId(Long planId);

 /*
   "Tamamlanan İşlemler" ekranı için: müdürün KENDİ atadığı, tamamlanmış
   serbest görevler (en yeniden eskiye).
 */
 List<TaskAssignment> findByTaskTypeAndStatusAndAssignedByOrderByCompletedAtDesc(
         TaskType taskType, TaskStatus status, Long assignedBy);

 // Aynısının ADMIN sürümü: kim atamış olursa olsun tamamlanmış tüm serbest görevler.
 List<TaskAssignment> findByTaskTypeAndStatusOrderByCompletedAtDesc(
         TaskType taskType, TaskStatus status);
}
