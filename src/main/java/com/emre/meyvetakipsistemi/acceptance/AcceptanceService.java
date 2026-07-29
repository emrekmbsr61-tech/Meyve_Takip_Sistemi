package com.emre.meyvetakipsistemi.acceptance;

import com.emre.meyvetakipsistemi.acceptance.dto.AcceptanceItemRequest;
import com.emre.meyvetakipsistemi.acceptance.dto.AcceptanceRequest;
import com.emre.meyvetakipsistemi.needlist.NeedList;
import com.emre.meyvetakipsistemi.needlist.NeedListRepository;
import com.emre.meyvetakipsistemi.needlist.NeedListStatus;
import com.emre.meyvetakipsistemi.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AcceptanceService {
    private final AcceptanceRepository acceptanceRepository;
    private final AcceptanceItemRepository itemRepository;
    private final NeedListRepository needListRepository;
    private final UserRepository userRepository;

    public AcceptanceService(AcceptanceRepository acceptanceRepository, AcceptanceItemRepository itemRepository, NeedListRepository needListRepository, UserRepository userRepository) {
        this.acceptanceRepository = acceptanceRepository;
        this.itemRepository = itemRepository;
        this.needListRepository = needListRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Acceptance create(AcceptanceRequest request) {
        if (request.getPlanId() == null || request.getReceivedBy() == null || request.getItems() == null || request.getItems().isEmpty()) throw new IllegalArgumentException("Plan, teslim alan kullanıcı ve ürünler zorunludur.");
        userRepository.findById(request.getReceivedBy()).orElseThrow(() -> new IllegalArgumentException("Kullanıcı bulunamadı."));
        Acceptance acceptance = new Acceptance();
        acceptance.setPlanId(request.getPlanId());
        acceptance.setReceivedBy(request.getReceivedBy());
        Acceptance saved = acceptanceRepository.save(acceptance);
        for (AcceptanceItemRequest requestItem : request.getItems()) {
            NeedList need = needListRepository.findById(requestItem.getNeedListId()).orElseThrow(() -> new IllegalArgumentException("İhtiyaç kaydı bulunamadı."));
            if (!need.getPlanId().equals(request.getPlanId())) throw new IllegalArgumentException("Ürün seçilen plana ait değil.");
            double accepted = requestItem.getAcceptedQuantity() == null ? 0 : requestItem.getAcceptedQuantity();
            double rejected = requestItem.getRejectedQuantity() == null ? 0 : requestItem.getRejectedQuantity();
            if (accepted < 0 || rejected < 0 || accepted + rejected > need.getRequiredQuantity()) throw new IllegalArgumentException("Kabul ve red miktarları beklenen miktarı geçemez.");
            AcceptanceItem item = new AcceptanceItem();
            item.setAcceptanceId(saved.getId()); item.setNeedListId(need.getId()); item.setFruitId(need.getFruitId()); item.setExpectedQuantity(need.getRequiredQuantity()); item.setAcceptedQuantity(accepted); item.setRejectedQuantity(rejected); item.setDamaged(Boolean.TRUE.equals(requestItem.getDamaged())); item.setRejectionReason(requestItem.getRejectionReason());
            itemRepository.save(item);
            need.setStatus(NeedListStatus.APPROVED);
            needListRepository.save(need);
        }
        return saved;
    }
}
