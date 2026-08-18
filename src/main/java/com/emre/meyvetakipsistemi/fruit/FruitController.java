package com.emre.meyvetakipsistemi.fruit;

import com.emre.meyvetakipsistemi.fruit.dto.FruitResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/*
  Meyve işlemleri için dışarıdan gelen API isteklerini karşılar ve
  FruitService katmanına yönlendirir.

  Cevaplarda Fruit entity'si değil FruitResponse döner (şartname kuralı:
  entity'ler doğrudan dışarı açılmaz).
*/
@RestController
@RequestMapping("api/fruits")
@CrossOrigin(origins = "*")
public class FruitController {

    @Autowired
    private FruitService fruitService;

    /*
      Yeni meyve kaydı oluşturur.
      Katalog yönetimi yönetici işidir; şartnamede meyve ekleme/güncelleme
      ADMIN yetkisi olarak tanımlanmıştır.
    */
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public FruitResponse createFruit(@RequestBody Fruit fruit) {
        return fruitService.createFruit(fruit);
    }

    // Sistemdeki tüm meyveleri listeler (tüm roller görebilir).
    @GetMapping
    public List<FruitResponse> getAllFruits() {
        return fruitService.getAllFruits();
    }

    // Id değerine göre tek bir meyve getirir.
    @GetMapping("/{id}")
    public FruitResponse getFruitById(@PathVariable Long id) {
        return fruitService.getFruitById(id);
    }
}
