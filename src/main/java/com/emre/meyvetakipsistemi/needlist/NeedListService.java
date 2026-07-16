package com.emre.meyvetakipsistemi.needlist;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NeedListService {

    @Autowired
    private NeedListRepository needListRepository;

    public NeedList createNeedList(NeedList needList) {
        if (needList.getCreatedDate() == null) {
            needList.setCreatedDate(LocalDateTime.now());
        }

        if (needList.getStatus() == null) {
            needList.setStatus(NeedListStatus.CREATED);

        }
            return needListRepository.save(needList);

    }

    public List<NeedList> getAllNeedLists() {
        return needListRepository.findAll();
    }

    public NeedList getNeedListById(Long id) {
        return needListRepository.findById(id)
                .orElseThrow();
    }

    public List<NeedList> getNeedListsByPlanId(Long planId) {
        return needListRepository.findByPlanId(planId);
    }
}