package com.emre.meyvetakipsistemi.supplier;

import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

// Tedarikçi bilgilerine ait iş mantığını yönetir.
@Service
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public SupplierService(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    // Alım ekranında seçilebilecek aktif tedarikçileri, mümkünse supplierCode'a
    // göre sayısal artan sırada döner.
    public List<Supplier> getActiveSuppliers() {
        List<Supplier> suppliers = supplierRepository.findByIsActiveTrue();
        suppliers.sort(Comparator.comparing(this::supplierCodeSortKey));
        return suppliers;
    }

    /*
      supplierCode sayısal bir metinse (ör. "4") o sayıyı, değilse veya boşsa
      listenin en sonuna düşecek şekilde büyük bir değeri sıralama anahtarı
      olarak döner. Böylece kod alanı henüz girilmemiş eski kayıtlar da hata
      vermeden listelenir.
    */
    private Integer supplierCodeSortKey(Supplier supplier) {
        String code = supplier.getSupplierCode();

        if (code == null || code.isBlank()) {
            return Integer.MAX_VALUE;
        }

        try {
            return Integer.parseInt(code.trim());
        } catch (NumberFormatException e) {
            return Integer.MAX_VALUE;
        }
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
