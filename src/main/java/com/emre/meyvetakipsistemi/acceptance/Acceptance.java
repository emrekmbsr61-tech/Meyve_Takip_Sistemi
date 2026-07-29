package com.emre.meyvetakipsistemi.acceptance;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
@Entity @Table(name = "acceptances") @Getter @Setter
public class Acceptance {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 private Long planId; private Long receivedBy; private LocalDateTime createdAt = LocalDateTime.now();
 @Enumerated(EnumType.STRING) private AcceptanceStatus status = AcceptanceStatus.COMPLETED;
}
