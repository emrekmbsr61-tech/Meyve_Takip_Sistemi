package com.emre.meyvetakipsistemi.user.dto;

import lombok.Getter;
import lombok.Setter;

// ADMIN'in bir kullanıcıya rol atarken gönderdiği bilgiyi taşır.
@Getter
@Setter
public class AssignRoleRequest {

    // İsteği yapan yöneticinin id'sidir; ADMIN yetkisi bu üzerinden doğrulanır.
    private Long adminId;

    // Atanacak rol adı (örn: "MAGAZA_PERSONELI").
    private String role;
}
