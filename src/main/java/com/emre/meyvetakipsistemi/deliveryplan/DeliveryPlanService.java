package com.emre.meyvetakipsistemi.deliveryplan;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
/*

    Teslimat planı,
    NeedList, Purchase, Collection ve Acceptance süreçlerini
    ileride aynı planId üzerinden birbirine bağlayacak.

 */


@Service
public class DeliveryPlanService {

    @Autowired
    private DeliveryPlanRepository deliveryPlanRepository;

    // Yeni teslimat planı oluşturma.
    public DeliveryPlan createDeliveryPlan(DeliveryPlan deliveryPlan){

      if (deliveryPlan.getPlanStatus() == null) {
          deliveryPlan.setPlanStatus(PlanStatus.CREATED);
      }

      if (deliveryPlan.getCreatedDate() == null){
        deliveryPlan.setCreatedDate(LocalDateTime.now());
      }

      return deliveryPlanRepository.save(deliveryPlan);

    }

    public List<DeliveryPlan> getAllDeliveryPlans(){
        return deliveryPlanRepository.findAll();
    }

    public DeliveryPlan getDeliveryPlanById(Long id) {
        return deliveryPlanRepository.findById(id)
                .orElseThrow();

    }


}
