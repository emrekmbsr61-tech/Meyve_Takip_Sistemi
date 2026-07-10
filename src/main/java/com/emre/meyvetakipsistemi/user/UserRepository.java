package com.emre.meyvetakipsistemi.user;

import org.springframework.data.jpa.repository.JpaRepository;

/*
 * UserRepository, users tablosu ile veritabanı işlemlerini yapar.
 * JpaRepository sayesinde save, findAll, findById, delete gibi temel işlemler hazır gelir.

 */

public interface UserRepository extends JpaRepository<User, Long> {
}
