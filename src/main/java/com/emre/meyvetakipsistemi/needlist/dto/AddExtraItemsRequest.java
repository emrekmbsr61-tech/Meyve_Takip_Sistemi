package com.emre.meyvetakipsistemi.needlist.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

// Müdürün var olan bir plana ekstra ürün eklemek için gönderdiği istektir.
@Getter
@Setter
public class AddExtraItemsRequest {

    private Long managerId;

    private List<NeedListPlanItemRequest> items;
}
