package com.emre.meyvetakipsistemi.supplier;

import org.springframework.web.bind.annotation.*;

import java.util.List;

// Alım ekranı için tedarikçi bilgisi sağlayan endpoint'leri karşılar.
@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {

    private final SupplierService supplierService;

    public SupplierController(SupplierService supplierService) {
        this.supplierService = supplierService;
    }

    // Alım ekranında seçilebilecek aktif tedarikçileri döner.
    @GetMapping("/active")
    public List<Supplier> getActiveSuppliers() {
        return supplierService.getActiveSuppliers();
    }
}
