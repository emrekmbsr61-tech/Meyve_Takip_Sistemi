package com.emre.meyvetakipsistemi.supplier;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/*
 * SupplierRepository, suppliers tablosu ile veritabanı işlemlerini yapar.
 */
public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    // Alım ekranında seçilebilecek aktif tedarikçileri listelemek için kullanılır.
    List<Supplier> findByIsActiveTrue();
}
