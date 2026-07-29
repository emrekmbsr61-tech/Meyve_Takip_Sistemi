package com.emre.meyvetakipsistemi.needlist;

import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditLogService;
import com.emre.meyvetakipsistemi.fruit.Fruit;
import com.emre.meyvetakipsistemi.fruit.FruitRepository;
import com.emre.meyvetakipsistemi.needlist.dto.NeedListRequest;
import com.emre.meyvetakipsistemi.needlist.dto.NeedListResponse;
import com.emre.meyvetakipsistemi.user.User;
import com.emre.meyvetakipsistemi.user.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

// İhtiyaç listesi işlemlerinin iş mantığını yönetir.
@Service
public class NeedListService {

    private final NeedListRepository needListRepository;
    private final FruitRepository fruitRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    // Spring gerekli repository ve service nesnelerini buradan otomatik verir.
    public NeedListService(
            NeedListRepository needListRepository,
            FruitRepository fruitRepository,
            UserRepository userRepository,
            AuditLogService auditLogService
    ) {
        this.needListRepository = needListRepository;
        this.fruitRepository = fruitRepository;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
    }

    // Frontend'den gelen request bilgisiyle yeni ihtiyaç listesi oluşturur.
    public NeedListResponse createNeedList(NeedListRequest request) {

        NeedList needList = new NeedList();

        needList.setPlanId(request.getPlanId());
        needList.setFruitId(request.getFruitId());
        needList.setRequiredQuantity(request.getRequiredQuantity());
        needList.setCreatedBy(request.getCreatedBy());
        needList.setNotes(request.getNotes());
        needList.setCreatedDate(LocalDateTime.now());
        needList.setStatus(NeedListStatus.CREATED);

        NeedList savedNeedList = needListRepository.save(needList);

        String userFullName = getUserFullName(savedNeedList.getCreatedBy());

        auditLogService.createLog(
                savedNeedList.getCreatedBy(),
                userFullName,
                AuditActionType.NEED_LIST_CREATED,
                "NeedList",
                savedNeedList.getId(),
                userFullName + " ihtiyaç listesi oluşturdu. Kayıt ID: " + savedNeedList.getId()
        );

        return convertToResponse(savedNeedList);
    }

    // Tüm ihtiyaç listelerini frontend'e response olarak döndürür.
    public List<NeedListResponse> getAllNeedLists() {
        return needListRepository.findAll()
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    // ID'ye göre ihtiyaç listesi getirir.
    public NeedListResponse getNeedListById(Long id) {
        NeedList needList = needListRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("İhtiyaç listesi bulunamadı"));

        return convertToResponse(needList);
    }

    // ID'ye göre ihtiyaç listesini günceller.
    public NeedListResponse updateNeedList(Long id, NeedListRequest request) {
        NeedList needList = needListRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("İhtiyaç listesi bulunamadı"));

        needList.setPlanId(request.getPlanId());
        needList.setFruitId(request.getFruitId());
        needList.setRequiredQuantity(request.getRequiredQuantity());
        needList.setNotes(request.getNotes());

        NeedList updatedNeedList = needListRepository.save(needList);

        String userFullName = getUserFullName(updatedNeedList.getCreatedBy());

        auditLogService.createLog(
                updatedNeedList.getCreatedBy(),
                userFullName,
                AuditActionType.NEED_LIST_UPDATED,
                "NeedList",
                updatedNeedList.getId(),
                userFullName + " ihtiyaç listesini güncelledi. Kayıt ID: " + updatedNeedList.getId()
        );

        return convertToResponse(updatedNeedList);
    }

    // ID'ye göre ihtiyaç listesini siler.
    public void deleteNeedList(Long id) {
        NeedList needList = needListRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("İhtiyaç listesi bulunamadı"));

        Long userId = needList.getCreatedBy();
        String userFullName = getUserFullName(userId);
        Long deletedNeedListId = needList.getId();

        needListRepository.delete(needList);

        auditLogService.createLog(
                userId,
                userFullName,
                AuditActionType.NEED_LIST_DELETED,
                "NeedList",
                deletedNeedListId,
                userFullName + " ihtiyaç listesini sildi. Kayıt ID: " + deletedNeedListId
        );
    }

    // Entity bilgisini frontend'e dönecek response yapısına çevirir.
    private NeedListResponse convertToResponse(NeedList needList) {

        Fruit fruit = fruitRepository.findById(needList.getFruitId()).orElse(null);
        String fruitName = fruit == null ? "Bilinmeyen meyve" : fruit.getName();
        String fruitCode = fruit == null ? null : fruit.getCode();

        String createdByName = getUserFullName(needList.getCreatedBy());

        return new NeedListResponse(
                needList.getId(),
                needList.getPlanId(),
                needList.getFruitId(),
                fruitName,
                fruitCode,
                fruit == null ? null : fruit.getUnit(),
                needList.getRequiredQuantity(),
                needList.getCreatedBy(),
                createdByName,
                needList.getCreatedDate(),
                needList.getNotes(),
                needList.getStatus()
        );
    }

    // Kullanıcı id bilgisinden ad soyad bilgisini bulur.
    private String getUserFullName(Long userId) {
        return userRepository.findById(userId)
                .map(User::getFullName)
                .orElse("Bilinmeyen kullanıcı");
    }
}
