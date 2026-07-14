package com.emre.meyvetakipsistemi.deliveryplan;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.*;
import java.util.List;


/*

    teslimat planı için dışarıdan gelen apı isteklerını karsılar

 */

@RestController
@RequestMapping("/api/delivery-plans")
public class DeliveryPlanController {

    @Autowired
    private DeliveryPlanService deliveryPlanService;

    //Yeni Teslimat Planı Oluşturur.
    @PostMapping
    public DeliveryPlan createDeliveryPlan(@RequestBody DeliveryPlan deliveryPlan){
        return deliveryPlanService.createDeliveryPlan(deliveryPlan);
    }

    // Sistemdeki tüm teslimat planlarını listeler.

    @GetMapping
    public List<DeliveryPlan> getAllDeliveryPlans(){
        return deliveryPlanService.getAllDeliveryPlans();
    }

    // Id değerine göre tek bir teslimat planı getirir.

    @GetMapping("/{id}")
    public DeliveryPlan getDeliveryPlanById(@PathVariable Long id) {
        return deliveryPlanService.getDeliveryPlanById(id);
    }


}
