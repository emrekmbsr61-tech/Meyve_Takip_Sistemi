package com.emre.meyvetakipsistemi.acceptance;
import com.emre.meyvetakipsistemi.acceptance.dto.AcceptanceRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/acceptances") @CrossOrigin(origins = "*")
public class AcceptanceController {
 private final AcceptanceService acceptanceService;
 public AcceptanceController(AcceptanceService acceptanceService) { this.acceptanceService = acceptanceService; }
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public Acceptance create(@RequestBody AcceptanceRequest request) { return acceptanceService.create(request); }
}
