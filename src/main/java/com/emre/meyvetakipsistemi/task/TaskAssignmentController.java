package com.emre.meyvetakipsistemi.task;

import com.emre.meyvetakipsistemi.task.dto.TaskAssignmentResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/*
  Görev okuma ve görev durumu değiştirme isteklerini karşılar.

  Cevaplarda TaskAssignment entity'si değil TaskAssignmentResponse döner
  (şartname kuralı: entity'ler doğrudan dışarı açılmaz).
  Hata yönetimi merkezidir (bkz. GlobalExceptionHandler); burada try/catch yoktur.
*/
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
    public List<TaskAssignmentResponse> getTasks(@RequestParam Long userId) {
        return service.getTasks(userId);
    }

    @PatchMapping("/{id}/start")
    public TaskAssignmentResponse start(@PathVariable Long id) {
        return service.start(id);
    }

    // Şoförün TESLİMAT görevini tamamlar; aynı plan için gerekiyorsa yeni bir KABUL görevi atar.
    @PatchMapping("/{id}/complete-delivery")
    public ResponseEntity<?> completeDelivery(@PathVariable Long id, @RequestParam Long driverId) {
        return ResponseEntity.ok(service.completeDelivery(id, driverId));
    }
}
