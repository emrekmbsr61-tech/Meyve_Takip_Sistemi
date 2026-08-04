package com.emre.meyvetakipsistemi.acceptance;
import com.emre.meyvetakipsistemi.acceptance.dto.AcceptanceRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController @RequestMapping("/api/acceptances") @CrossOrigin(origins = "*")
public class AcceptanceController {
 private final AcceptanceService acceptanceService;
 public AcceptanceController(AcceptanceService acceptanceService) { this.acceptanceService = acceptanceService; }

 /*
   Not: Önceden burada try/catch yoktu; Service'ten fırlatılan hata mesajı
   frontend'e hiç ulaşmıyordu (Spring'in varsayılan 500 hata sayfası dönüyordu).
   Diğer controller'larla (Purchase/Collection/NeedList) aynı desene getirildi.
   Body JSON olarak {"message": ...} döner çünkü frontend/acceptanceService.js
   zaten data?.message okuyor.
 */
 @PostMapping
 public ResponseEntity<?> create(@RequestBody AcceptanceRequest request) {
     try {
         return ResponseEntity.status(HttpStatus.CREATED).body(acceptanceService.create(request));
     } catch (RuntimeException e) {
         return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", e.getMessage()));
     }
 }
}
