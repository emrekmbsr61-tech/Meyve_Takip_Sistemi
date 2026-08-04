package com.emre.meyvetakipsistemi.task;
import org.springframework.stereotype.Service;
import java.util.List;
@Service
public class TaskAssignmentService {
 private final TaskAssignmentRepository taskRepository;
 public TaskAssignmentService(TaskAssignmentRepository taskRepository) { this.taskRepository = taskRepository; }
 // Yalnızca kullanıcıya atanmış mevcut görevleri okur; yeni görev oluşturmaz.
 // KABUL görevi artık yalnızca CollectionService.completeToplamaAndAssignKabul tarafından oluşturulur.
 public List<TaskAssignment> getTasks(Long userId) { return taskRepository.findByAssignedUserIdOrderByDueDateAsc(userId); }
 public TaskAssignment start(Long id) { TaskAssignment task = taskRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Görev bulunamadı.")); task.setStatus(TaskStatus.IN_PROGRESS); return taskRepository.save(task); }
}
