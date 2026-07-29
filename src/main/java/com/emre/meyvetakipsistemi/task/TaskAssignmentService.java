package com.emre.meyvetakipsistemi.task;
import com.emre.meyvetakipsistemi.needlist.NeedListRepository;
import org.springframework.stereotype.Service;
import java.util.List;
@Service
public class TaskAssignmentService {
 private final TaskAssignmentRepository taskRepository; private final NeedListRepository needListRepository;
 public TaskAssignmentService(TaskAssignmentRepository taskRepository, NeedListRepository needListRepository) { this.taskRepository = taskRepository; this.needListRepository = needListRepository; }
 public List<TaskAssignment> getTasks(Long userId) { needListRepository.findAll().stream().filter(need -> userId.equals(need.getCreatedBy())).map(need -> need.getPlanId()).distinct().forEach(planId -> taskRepository.findByPlanIdAndAssignedUserIdAndTaskType(planId, userId, TaskType.ACCEPTANCE).orElseGet(() -> { TaskAssignment task = new TaskAssignment(); task.setPlanId(planId); task.setAssignedUserId(userId); return taskRepository.save(task); })); return taskRepository.findByAssignedUserIdOrderByDueDateAsc(userId); }
 public TaskAssignment start(Long id) { TaskAssignment task = taskRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Görev bulunamadı.")); task.setStatus(TaskStatus.IN_PROGRESS); return taskRepository.save(task); }
}
