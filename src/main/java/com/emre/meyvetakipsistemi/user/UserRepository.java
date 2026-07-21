package com.emre.meyvetakipsistemi.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/*
 * UserRepository, users tablosu ile veritabanı işlemlerini yapar.
 * JpaRepository sayesinde save, findAll, findById, delete gibi temel işlemler hazır gelir.

 */

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username); //login için username e gore kullanıcı arama

}
