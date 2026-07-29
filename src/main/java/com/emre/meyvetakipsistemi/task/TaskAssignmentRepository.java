package com.emre.meyvetakipsistemi.task;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface TaskAssignmentRepository extends JpaRepository<TaskAssignment, Long> { List<TaskAssignment> findByAssignedUserIdOrderByDueDateAsc(Long assignedUserId); Optional<TaskAssignment> findByPlanIdAndAssignedUserIdAndTaskType(Long planId, Long assignedUserId, TaskType taskType); }
