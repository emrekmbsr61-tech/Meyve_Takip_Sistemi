package com.emre.meyvetakipsistemi.task;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/tasks") @CrossOrigin(origins = "*")
public class TaskAssignmentController { private final TaskAssignmentService service; public TaskAssignmentController(TaskAssignmentService service) { this.service = service; } @GetMapping public List<TaskAssignment> getTasks(@RequestParam Long userId) { return service.getTasks(userId); } @PatchMapping("/{id}/start") public TaskAssignment start(@PathVariable Long id) { return service.start(id); } }
