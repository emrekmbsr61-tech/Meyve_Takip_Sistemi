package com.emre.meyvetakipsistemi.acceptance.dto;
import lombok.Getter;
import lombok.Setter;
import java.util.List;
@Getter @Setter
public class AcceptanceRequest { private Long planId; private Long receivedBy; private List<AcceptanceItemRequest> items; }
