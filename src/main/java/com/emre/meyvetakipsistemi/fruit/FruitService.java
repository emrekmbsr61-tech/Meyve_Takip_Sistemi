package com.emre.meyvetakipsistemi.fruit;

import com.emre.meyvetakipsistemi.exception.ResourceNotFoundException;
import com.emre.meyvetakipsistemi.fruit.dto.FruitResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

/*
  Meyvelerle ilgili iş mantığını tutar.

    createFruit  -> yeni meyve kaydeder
    getAllFruits -> tüm meyveleri listeler
    getFruitById -> id'ye göre meyve getirir

  Dışarıya her zaman FruitResponse döner; Fruit entity'si API cevabında
  hiçbir zaman doğrudan kullanılmaz.
*/
@Service
public class FruitService {

    @Autowired
    private FruitRepository fruitRepository;

    // Yeni meyve kaydı oluşturur.
    public FruitResponse createFruit(Fruit fruit) {
        return toResponse(fruitRepository.save(fruit));
    }

    // Tüm meyveleri listeler.
    public List<FruitResponse> getAllFruits() {
        return fruitRepository.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    // Id değerine göre tek bir meyve getirir.
    public FruitResponse getFruitById(Long id) {
        Fruit fruit = fruitRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ürün bulunamadı: " + id));

        return toResponse(fruit);
    }

    // Entity'yi dışarı açılabilecek güvenli hâle çevirir.
    private FruitResponse toResponse(Fruit fruit) {
        return new FruitResponse(
                fruit.getId(),
                fruit.getName(),
                fruit.getCode(),
                fruit.getUnit(),
                fruit.getImagePath(),
                fruit.getIsActive(),
                fruit.getIsPerishable(),
                fruit.getProfitMarginPercent()
        );
    }
}
