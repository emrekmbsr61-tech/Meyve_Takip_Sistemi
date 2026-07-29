package com.emre.meyvetakipsistemi.task;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
@Entity @Table(name = "task_assignments") @Getter @Setter
public class TaskAssignment {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 private Long planId; private Long assignedUserId; private LocalDateTime assignedAt = LocalDateTime.now(); private LocalDateTime dueDate = LocalDateTime.now().plusHours(8);
 @Enumerated(EnumType.STRING) private TaskType taskType = TaskType.ACCEPTANCE;
 @Enumerated(EnumType.STRING) private TaskStatus status = TaskStatus.PENDING;
}
