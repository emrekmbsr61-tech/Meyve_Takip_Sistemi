package com.emre.meyvetakipsistemi.acceptance;
import com.emre.meyvetakipsistemi.acceptance.dto.AcceptanceRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

/*
  Hata yönetimi: Burada try/catch YOKTUR. Service'ten fırlatılan hatalar
  GlobalExceptionHandler tarafından yakalanır ve frontend'e her zaman aynı
  biçimde (ErrorResponse) JSON olarak döner.
*/
@RestController @RequestMapping("/api/acceptances") @CrossOrigin(origins = "*")
public class AcceptanceController {
 private final AcceptanceService acceptanceService;
 public AcceptanceController(AcceptanceService acceptanceService) { this.acceptanceService = acceptanceService; }

 // Mal kabul sayımı yalnızca mağaza personelinin işidir (bağımsız sayım kuralı).
 @PreAuthorize("hasRole('MAGAZA_PERSONELI')")
 @PostMapping
 public ResponseEntity<?> create(@RequestBody AcceptanceRequest request) {
     return ResponseEntity.status(HttpStatus.CREATED).body(acceptanceService.create(request));
 }

 // "Tamamlanan İşlemler" ekranı için geçmiş mal kabul kayıtlarını döner (yönetim raporu).
 @PreAuthorize("hasAnyRole('ADMIN','MAGAZA_MUDURU')")
 @GetMapping("/completed")
 public ResponseEntity<?> getCompletedAcceptances(@RequestParam Long userId) {
     return ResponseEntity.ok(acceptanceService.getCompletedAcceptances(userId));
 }

 // Kabul ekranının kaydetmeden önce göstereceği "beklenen miktar" listesini döner.
 @PreAuthorize("hasRole('MAGAZA_PERSONELI')")
 @GetMapping("/checklist/{planId}")
 public ResponseEntity<?> getAcceptanceChecklist(@PathVariable Long planId, @RequestParam Long userId) {
     return ResponseEntity.ok(acceptanceService.getAcceptanceChecklist(userId, planId));
 }
}
