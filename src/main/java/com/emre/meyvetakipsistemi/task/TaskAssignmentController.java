package com.emre.meyvetakipsistemi.task;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "*")
public class TaskAssignmentController {

    private final TaskAssignmentService service;

    public TaskAssignmentController(TaskAssignmentService service) {
        this.service = service;
    }

    // Kullanıcıya atanmış mevcut görevleri döner. Yeni görev OLUŞTURMAZ, yalnızca okur.
    @GetMapping
    public List<TaskAssignment> getTasks(@RequestParam Long userId) {
        return service.getTasks(userId);
    }

    @PatchMapping("/{id}/start")
    public TaskAssignment start(@PathVariable Long id) {
        return service.start(id);
    }

    // Şoförün TESLİMAT görevini tamamlar; aynı plan için gerekiyorsa yeni bir KABUL görevi atar.
    @PatchMapping("/{id}/complete-delivery")
    public ResponseEntity<?> completeDelivery(@PathVariable Long id, @RequestParam Long driverId) {
        try {
            return ResponseEntity.ok(service.completeDelivery(id, driverId));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}