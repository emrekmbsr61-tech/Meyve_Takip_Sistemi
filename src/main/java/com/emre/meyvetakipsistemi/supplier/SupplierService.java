package com.emre.meyvetakipsistemi.supplier;

import org.springframework.stereotype.Service;

import java.util.List;

// Tedarikçi bilgilerine ait iş mantığını yönetir.
@Service
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public SupplierService(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    // Alım ekranında seçilebilecek aktif tedarikçileri döner.
    public List<Supplier> getActiveSuppliers() {
        return supplierRepository.findByIsActiveTrue();
    }

    // Bir alım kaydı oluşturulmadan önce tedarikçinin var ve aktif olduğunu doğrular.
    public Supplier requireActiveSupplier(Long supplierId) {
        if (supplierId == null) {
            throw new RuntimeException("Tedarikçi seçilmelidir");
        }

        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new RuntimeException("Tedarikçi bulunamadı"));

        if (!Boolean.TRUE.equals(supplier.getIsActive())) {
            throw new RuntimeException("Seçilen tedarikçi aktif değil");
        }

        return supplier;
    }
}
