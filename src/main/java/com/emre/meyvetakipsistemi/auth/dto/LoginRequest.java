package com.emre.meyvetakipsistemi.auth.dto;

import lombok.Getter;
import lombok.Setter;

// Frontend'den login için gelen bilgileri taşır.
@Getter
@Setter
public class LoginRequest {

    // Giriş yapan kullanıcının kullanıcı adıdır.
    private String username;

    // Giriş yapan kullanıcının şifresidir.
    private String password;
}