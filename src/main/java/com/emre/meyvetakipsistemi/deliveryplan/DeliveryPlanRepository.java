package com.emre.meyvetakipsistemi.deliveryplan;

import org.springframework.data.jpa.repository.JpaRepository;

/*

  DeliveryPlanRepository, delivery_plans tablosu ile veritabanı işlemlerini yapar.

 */
public interface DeliveryPlanRepository extends JpaRepository<DeliveryPlan, Long> {
}