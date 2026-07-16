package com.emre.meyvetakipsistemi.needlist;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NeedListRepository extends JpaRepository<NeedList, Long> {

    List<NeedList> findByPlanId(Long planId);
}
