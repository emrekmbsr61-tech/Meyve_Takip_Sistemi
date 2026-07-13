package com.emre.meyvetakipsistemi.fruit;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

/*  meyvelerle ilgili iş mantığını tutacağım

    createFruit → yeni meyve kaydeder
    getAllFruits → tüm meyveleri listeler
    getFruitById → id’ye göre meyve getirir

*/
@Service
public class FruitService {

    @Autowired
    private FruitRepository fruitRepository;

    // Yeni meyve kaydı oluşturma
    public Fruit createFruit(Fruit fruit)
    {
        return fruitRepository.save(fruit);
    }

    //Tüm meyveleri listeleme
    public List<Fruit> getAllFruits()
    {
        return fruitRepository.findAll();
    }

    //Id değerine göre tek bir meyve getirme
    public Fruit getFruitById(Long id)
    {
        return fruitRepository.findById(id)
                .orElseThrow();
    }

}
