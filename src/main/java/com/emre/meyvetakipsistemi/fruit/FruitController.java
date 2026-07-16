package com.emre.meyvetakipsistemi.fruit;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/*
    FruitController, meyve işlemleri için dışarıdan gelen API isteklerini karşılar
    Gelen istekleri FruitService katmanına yönlendirir.
 */

@RestController
@RequestMapping("api/fruits")
@CrossOrigin(origins = "*")
public class FruitController {

    @Autowired
    private FruitService fruitService;

    //Yeni meyve kaydı oluşturma.
    @PostMapping
    public Fruit createFruit(@RequestBody Fruit fruit) {       //gelen jsonu fruite cevirir

        return fruitService.createFruit(fruit);
    }

    // Sistemdeki tüm meyveleri listeleme.
    @GetMapping
    public List<Fruit> getAllFruits() {

        return fruitService.getAllFruits();
    }

    // Id değerine göre tek bir meyve getirme.
    @GetMapping("/{id}")
    public Fruit getFruitById(@PathVariable Long id) {        //urldeki id değerini alır
        return fruitService.getFruitById(id);
    }
}

