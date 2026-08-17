package com.emre.meyvetakipsistemi.acceptance;
import com.emre.meyvetakipsistemi.acceptance.dto.AcceptanceRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/*
  Hata yönetimi: Burada try/catch YOKTUR. Service'ten fırlatılan hatalar
  GlobalExceptionHandler tarafından yakalanır ve frontend'e her zaman aynı
  biçimde (ErrorResponse) JSON olarak döner.
*/
@RestController @RequestMapping("/api/acceptances") @CrossOrigin(origins = "*")
public class AcceptanceController {
 private final AcceptanceService acceptanceService;
 public AcceptanceController(AcceptanceService acceptanceService) { this.acceptanceService = acceptanceService; }

 @PostMapping
 public ResponseEntity<?> create(@RequestBody AcceptanceRequest request) {
     return ResponseEntity.status(HttpStatus.CREATED).body(acceptanceService.create(request));
 }

 // "Tamamlanan İşlemler" ekranı için geçmiş mal kabul kayıtlarını döner.
 @GetMapping("/completed")
 public ResponseEntity<?> getCompletedAcceptances(@RequestParam Long userId) {
     return ResponseEntity.ok(acceptanceService.getCompletedAcceptances(userId));
 }

 // Kabul ekranının kaydetmeden önce göstereceği "beklenen miktar" listesini döner.
 @GetMapping("/checklist/{planId}")
 public ResponseEntity<?> getAcceptanceChecklist(@PathVariable Long planId, @RequestParam Long userId) {
     return ResponseEntity.ok(acceptanceService.getAcceptanceChecklist(userId, planId));
 }
}
