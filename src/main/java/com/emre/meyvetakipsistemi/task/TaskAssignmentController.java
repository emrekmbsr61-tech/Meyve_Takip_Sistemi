package com.emre.meyvetakipsistemi.task;

import com.emre.meyvetakipsistemi.task.dto.AssignableUserResponse;
import com.emre.meyvetakipsistemi.task.dto.CompletedTaskResponse;
import com.emre.meyvetakipsistemi.task.dto.CreateTaskRequest;
import com.emre.meyvetakipsistemi.task.dto.TaskAssignmentResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;

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

    /*
      Müdürün ELLE görev atamasını karşılar (örn. "Depo temizliği").

      Akış görevlerinden farkı: bu görev bir ihtiyaç planına bağlı değildir,
      müdür kişiyi/açıklamayı/süreyi kendisi belirler (bkz. TaskType.GENEL).
    */
    @PreAuthorize("hasRole('MAGAZA_MUDURU')")
    @PostMapping
    public ResponseEntity<?> createManualTask(@Valid @RequestBody CreateTaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createManualTask(request));
    }

    /*
      Personelin, kendisine atanan GENEL görevi tamamlamasını karşılar.
      Akış görevleri buradan tamamlanamaz (bkz. completeManualTask).
    */
    @PatchMapping("/{id}/complete")
    public TaskAssignmentResponse completeManualTask(@PathVariable Long id, @RequestParam Long userId) {
        return service.completeManualTask(id, userId);
    }

    /*
      "Tamamlanan İşlemler" ekranı için tamamlanmış serbest görevleri döner.
      Müdür kendi atadıklarını, ADMIN hepsini görür.
    */
    @PreAuthorize("hasAnyRole('ADMIN','MAGAZA_MUDURU')")
    @GetMapping("/completed")
    public List<CompletedTaskResponse> getCompletedManualTasks(@RequestParam Long userId) {
        return service.getCompletedManualTasks(userId);
    }

    // Müdürün görev atayabileceği personelleri (mağaza personeli + şoför) döner.
    @PreAuthorize("hasRole('MAGAZA_MUDURU')")
    @GetMapping("/assignable-users")
    public List<AssignableUserResponse> getAssignableUsers(@RequestParam Long managerId) {
        return service.getAssignableUsers(managerId);
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
