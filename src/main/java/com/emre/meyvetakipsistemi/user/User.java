package com.emre.meyvetakipsistemi.user;


import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

/*
  User entity'si sistemdeki kullanıcıları temsil eder.
*/

@Entity
@Table(name= "users" )
@Getter
@Setter

public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)// ID değeri veritabanı tarafından otomatik üretilir.
    private Long id;
    private String username;
    private String email;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;// UserService içinde hashlenip kaydedildi.

    @Enumerated(EnumType.STRING)// Rol bilgisi veritabanına ADMIN, SOFOR gibi yazı olarak kaydedilir.
    private UserRole role;
    private String fullName;
    private Boolean isVerified=false;// Yeni kullanıcı başlangıçta e-posta doğrulanmamış kabul edilir.



}
