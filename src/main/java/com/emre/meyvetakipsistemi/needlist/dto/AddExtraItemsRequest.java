package com.emre.meyvetakipsistemi.needlist.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

/*
  Var olan bir plana ekstra ürün ekleme isteğidir.

  Hem MAGAZA_MUDURU (Alım İşlemleri ekranından) hem de MAGAZA_PERSONELI
  (Mevcut İhtiyaçlar ekranından, yalnızca kendi planına) kullanabilir; bu yüzden
  alan adı "managerId" değil "userId"dir.
*/
@Getter
@Setter
public class AddExtraItemsRequest {

    private Long userId;

    private List<NeedListPlanItemRequest> items;
}
