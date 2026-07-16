package com.emre.meyvetakipsistemi.needlist;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/need-lists")
public class NeedListController {

    @Autowired
    private NeedListService needListService;

    @PostMapping
    public NeedList createNeedList(@RequestBody NeedList needList){
        return needListService.createNeedList(needList);
    }

    @GetMapping
    public List<NeedList> getAllNeedLists() {
        return needListService.getAllNeedLists();
    }

    @GetMapping("/{id}")
    public NeedList getNeedListById(@PathVariable Long id){
        return needListService.getNeedListById(id);
    }

    @GetMapping("/plan/{planId}")
    public List<NeedList> getNeedListsByPlanId(@PathVariable Long planId) {
        return needListService.getNeedListsByPlanId(planId);
    }

}
