package com.emre.meyvetakipsistemi.task;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface TaskAssignmentRepository extends JpaRepository<TaskAssignment, Long> {
 List<TaskAssignment> findByAssignedUserIdOrderByDueDateAsc(Long assignedUserId);
 Optional<TaskAssignment> findByPlanIdAndAssignedUserIdAndTaskType(Long planId, Long assignedUserId, TaskType taskType);
 // Bir planın belirli türdeki görevini (kullanıcıdan bağımsız) bulmak için kullanılır.
 // Purchase tamamlanınca ALIM görevini bulup COMPLETED yapmak ve aynı plan için
 // ikinci bir TOPLAMA görevi oluşturulmadığını kontrol etmek amacıyla kullanılır.
 Optional<TaskAssignment> findByPlanIdAndTaskType(Long planId, TaskType taskType);
}
