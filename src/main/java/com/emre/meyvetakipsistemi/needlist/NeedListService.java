package com.emre.meyvetakipsistemi.needlist;

import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditLog;
import com.emre.meyvetakipsistemi.auditlog.AuditLogService;
import com.emre.meyvetakipsistemi.deliveryplan.DeliveryPlan;
import com.emre.meyvetakipsistemi.deliveryplan.DeliveryPlanRepository;
import com.emre.meyvetakipsistemi.deliveryplan.DeliveryPlanService;
import com.emre.meyvetakipsistemi.deliveryplan.PlanStatus;
import com.emre.meyvetakipsistemi.fruit.Fruit;
import com.emre.meyvetakipsistemi.fruit.FruitRepository;
import com.emre.meyvetakipsistemi.needlist.dto.AddExtraItemsRequest;
import com.emre.meyvetakipsistemi.needlist.dto.NeedListPlanItemRequest;
import com.emre.meyvetakipsistemi.needlist.dto.NeedListPlanRequest;
import com.emre.meyvetakipsistemi.needlist.dto.NeedListPlanResponse;
import com.emre.meyvetakipsistemi.needlist.dto.NeedListRequest;
import com.emre.meyvetakipsistemi.needlist.dto.NeedListResponse;
import com.emre.meyvetakipsistemi.task.TaskAssignmentRepository;
import com.emre.meyvetakipsistemi.task.TaskType;
import com.emre.meyvetakipsistemi.user.User;
import com.emre.meyvetakipsistemi.user.UserRepository;
import com.emre.meyvetakipsistemi.user.UserRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

// İhtiyaç listesi işlemlerinin iş mantığını yönetir.
@Service
public class NeedListService {

    private final NeedListRepository needListRepository;
    private final FruitRepository fruitRepository;
    private final UserRepository userRepository;
    private final DeliveryPlanRepository deliveryPlanRepository;
    private final DeliveryPlanService deliveryPlanService;
    private final AuditLogService auditLogService;
    private final TaskAssignmentRepository taskAssignmentRepository;

    // Spring gerekli repository ve service nesnelerini buradan otomatik verir.
    public NeedListService(
            NeedListRepository needListRepository,
            FruitRepository fruitRepository,
            UserRepository userRepository,
            DeliveryPlanRepository deliveryPlanRepository,
            DeliveryPlanService deliveryPlanService,
            AuditLogService auditLogService,
            TaskAssignmentRepository taskAssignmentRepository
    ) {
        this.needListRepository = needListRepository;
        this.fruitRepository = fruitRepository;
        this.userRepository = userRepository;
        this.deliveryPlanRepository = deliveryPlanRepository;
        this.deliveryPlanService = deliveryPlanService;
        this.auditLogService = auditLogService;
        this.taskAssignmentRepository = taskAssignmentRepository;
    }

    /*
      ESKİ (tekil) ihtiyaç kaydı oluşturma. Hâlâ çalışır durumda bırakıldı fakat
      artık kullanılmamalı: planId'yi client'tan olduğu gibi kabul ediyor ve
      DeliveryPlan oluşturmuyor. Yeni akış için bkz. createNeedListPlan.
    */
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

    /*
      YENİ ihtiyaç planı oluşturma akışı.
      Aynı transaction içinde önce bir DeliveryPlan kaydı oluşturur, ardından bütün
      ürün satırlarını backend'in ürettiği bu yeni planId ile kaydeder. planId asla
      client'tan kabul edilmez. Bir ürün kaydedilemezse (örn. aynı meyve iki kez
      gönderilmişse) hiçbir şey kaydedilmeden hata döner (yarım plan kalmaz).
    */
    @Transactional
    public NeedListPlanResponse createNeedListPlan(NeedListPlanRequest request) {

        User creator = requireCreator(request.getCreatedBy());

        if (request.getStoreId() == null || request.getStoreId().isBlank()) {
            throw new RuntimeException("Mağaza seçilmelidir");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("En az bir ürün seçilmelidir");
        }

        // Aynı istekte aynı meyve iki kez gönderilmişse reddedilir.
        Set<Long> seenFruitIds = new HashSet<>();

        for (NeedListPlanItemRequest item : request.getItems()) {
            if (item.getFruitId() == null) {
                throw new RuntimeException("Ürün seçilmelidir");
            }

            if (!seenFruitIds.add(item.getFruitId())) {
                throw new RuntimeException("Aynı ürün planda birden fazla kez gönderildi");
            }

            if (item.getRequiredQuantity() == null || item.getRequiredQuantity() <= 0) {
                throw new RuntimeException("Geçerli bir miktar girilmelidir");
            }

            if (!fruitRepository.existsById(item.getFruitId())) {
                throw new RuntimeException("Ürün bulunamadı: " + item.getFruitId());
            }
        }

        // 1) Yeni bir DeliveryPlan kaydı oluşturulur; planId buradan üretilir.
        DeliveryPlan deliveryPlan = new DeliveryPlan();
        deliveryPlan.setStoreId(request.getStoreId());
        deliveryPlan.setPlanStatus(PlanStatus.CREATED);
        deliveryPlan.setCreatedDate(LocalDateTime.now());
        deliveryPlan.setGeneralNotes(request.getGeneralNotes());

        DeliveryPlan savedPlan = deliveryPlanRepository.save(deliveryPlan);

        auditLogService.createLog(
                creator.getId(),
                creator.getFullName(),
                AuditActionType.DELIVERY_PLAN_CREATED,
                "DeliveryPlan",
                savedPlan.getId(),
                creator.getFullName() + " " + request.getStoreId() + " mağazası için yeni plan oluşturdu. Plan #" + savedPlan.getId()
        );

        // 2) Her ürün için, backend'in ürettiği planId ile NeedList satırı oluşturulur.
        List<NeedListResponse> items = new ArrayList<>();

        for (NeedListPlanItemRequest item : request.getItems()) {
            NeedList needList = new NeedList();
            needList.setPlanId(savedPlan.getId());
            needList.setFruitId(item.getFruitId());
            needList.setRequiredQuantity(item.getRequiredQuantity());
            needList.setCreatedBy(creator.getId());
            needList.setNotes(item.getNotes());
            needList.setCreatedDate(LocalDateTime.now());
            needList.setStatus(NeedListStatus.CREATED);

            NeedList savedNeedList = needListRepository.save(needList);

            auditLogService.createLog(
                    creator.getId(),
                    creator.getFullName(),
                    AuditActionType.NEED_LIST_CREATED,
                    "NeedList",
                    savedNeedList.getId(),
                    creator.getFullName() + " ihtiyaç listesi oluşturdu. Plan #" + savedPlan.getId()
                            + ", Kayıt ID: " + savedNeedList.getId()
            );

            items.add(convertToResponse(savedNeedList));
        }

        DeliveryPlanService.PlanStoreInfo storeInfo = deliveryPlanService.resolveStoreInfo(savedPlan.getId());

        return new NeedListPlanResponse(
                savedPlan.getId(),
                storeInfo.storeId(),
                storeInfo.storeName(),
                savedPlan.getCreatedDate(),
                items
        );
    }

    /*
      Bir planı (tüm ürünleriyle birlikte) iptal eder.
      NeedList satırları mevcut projede zaten soft-delete kullanmadığı için burada da
      gerçek silme (hard delete) uygulanır — mevcut davranışla tutarlıdır. DeliveryPlan
      ise silinmez, CANCELLED durumuna alınır (bkz. görev talimatı). Yalnızca bu planId'ye
      ait kayıtlar etkilenir; başka planlara dokunulmaz.
    */
    @Transactional
    public void cancelNeedListPlan(Long planId, Long userId) {

        User canceller = requireCreator(userId);

        List<NeedList> needs = needListRepository.findByPlanId(planId);

        if (needs.isEmpty()) {
            throw new RuntimeException("Bu plana ait ihtiyaç kaydı bulunamadı");
        }

        int deletedCount = needs.size();

        needListRepository.deleteAll(needs);

        deliveryPlanRepository.findById(planId).ifPresent(plan -> {
            plan.setPlanStatus(PlanStatus.CANCELLED);
            deliveryPlanRepository.save(plan);
        });

        auditLogService.createLog(
                canceller.getId(),
                canceller.getFullName(),
                AuditActionType.DELIVERY_PLAN_CANCELLED,
                "DeliveryPlan",
                planId,
                canceller.getFullName() + " Plan #" + planId + " iptal etti (" + deletedCount + " ürün kaydı silindi)."
        );
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

        // Mağaza bilgisi backend'de çözülür (yeni plan: DeliveryPlan üzerinden;
        // eski/legacy plan: yalnızca görüntüleme amaçlı legacy eşleme üzerinden).
        DeliveryPlanService.PlanStoreInfo storeInfo = deliveryPlanService.resolveStoreInfo(needList.getPlanId());
        String storeId = storeInfo.storeId();
        String storeName = storeInfo.storeName();

        // "Son güncelleyen" bilgisi, yalnızca gerçekten bir güncelleme logu varsa doldurulur.
        String updatedByName = null;
        LocalDateTime updatedDate = null;

        AuditLog latestUpdateLog = auditLogService
                .findLatestLog("NeedList", needList.getId(), AuditActionType.NEED_LIST_UPDATED)
                .orElse(null);

        if (latestUpdateLog != null) {
            updatedByName = latestUpdateLog.getUserFullName();
            updatedDate = latestUpdateLog.getCreatedAt();
        }

        return new NeedListResponse(
                needList.getId(),
                needList.getPlanId(),
                storeId,
                storeName,
                needList.getFruitId(),
                fruitName,
                fruitCode,
                fruit == null ? null : fruit.getUnit(),
                needList.getRequiredQuantity(),
                needList.getCreatedBy(),
                createdByName,
                needList.getCreatedDate(),
                needList.getNotes(),
                needList.getStatus(),
                updatedByName,
                updatedDate
        );
    }

    // Kullanıcı id bilgisinden ad soyad bilgisini bulur.
    private String getUserFullName(Long userId) {
        return userRepository.findById(userId)
                .map(User::getFullName)
                .orElse("Bilinmeyen kullanıcı");
    }

    /*
      Müdürün, var olan bir plana ekstra ürün eklemesini sağlar. YENİ bir
      DeliveryPlan OLUŞTURMAZ — yalnızca aynı planId ile yeni NeedList satırları
      ekler. Bu sayede ekstra ürünler, Purchase/Collection/Acceptance'ın zaten
      kullandığı "needListRepository.findByPlanId(planId)" sorgusuyla otomatik
      olarak normal ürünlerle birlikte görünür; Purchase/Collection/Acceptance
      servislerinde hiçbir değişiklik gerekmez.

      ÖNEMLİ: Yeni satırların createdBy'ı MÜDÜR değil, planın MEVCUT sahibidir.
      Aksi halde TaskAssignmentService.resolvePlanOwner (Teslimat tamamlanınca
      Kabul görevini kime atayacağını bulan metot) "plana ait ihtiyaç kayıtları
      farklı kullanıcılara ait" hatası fırlatır, çünkü o metot tüm NeedList
      kayıtlarının createdBy'ının aynı kişi olmasını şart koşar.
    */
    @Transactional
    public List<NeedListResponse> addExtraItemsToPlan(Long planId, AddExtraItemsRequest request) {
        User manager = requireManager(request.getManagerId());

        List<NeedList> existingNeeds = needListRepository.findByPlanId(planId);

        if (existingNeeds.isEmpty()) {
            throw new RuntimeException("Bu plana ait ihtiyaç kaydı bulunamadı");
        }

        boolean planFinished = existingNeeds.stream()
                .anyMatch(need -> need.getStatus() == NeedListStatus.APPROVED || need.getStatus() == NeedListStatus.CANCELLED);

        if (planFinished) {
            throw new RuntimeException("Bu plan tamamlanmış veya iptal edilmiş, ürün eklenemez");
        }

        boolean purchaseAlreadyCompleted = taskAssignmentRepository
                .findByPlanIdAndTaskType(planId, TaskType.TOPLAMA)
                .isPresent();

        if (purchaseAlreadyCompleted) {
            throw new RuntimeException("Bu planın alımı zaten tamamlandığı için ekstra ürün eklenemez");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("En az bir ürün seçilmelidir");
        }

        // Planın orijinal sahibi korunur; ekstra ürünler de aynı kullanıcıya aitmiş gibi kaydedilir.
        Long planOwnerId = existingNeeds.get(0).getCreatedBy();

        Set<Long> existingFruitIds = existingNeeds.stream()
                .map(NeedList::getFruitId)
                .collect(java.util.stream.Collectors.toSet());
        Set<Long> seenFruitIds = new HashSet<>();

        for (NeedListPlanItemRequest item : request.getItems()) {
            if (item.getFruitId() == null) {
                throw new RuntimeException("Ürün seçilmelidir");
            }
            if (existingFruitIds.contains(item.getFruitId())) {
                throw new RuntimeException("Bu ürün zaten bu planda mevcut");
            }
            if (!seenFruitIds.add(item.getFruitId())) {
                throw new RuntimeException("Aynı ürün birden fazla kez gönderildi");
            }
            if (item.getRequiredQuantity() == null || item.getRequiredQuantity() <= 0) {
                throw new RuntimeException("Geçerli bir miktar girilmelidir");
            }
            if (!fruitRepository.existsById(item.getFruitId())) {
                throw new RuntimeException("Ürün bulunamadı: " + item.getFruitId());
            }
        }

        List<NeedListResponse> result = new ArrayList<>();

        for (NeedListPlanItemRequest item : request.getItems()) {
            NeedList needList = new NeedList();
            needList.setPlanId(planId);
            needList.setFruitId(item.getFruitId());
            needList.setRequiredQuantity(item.getRequiredQuantity());
            needList.setCreatedBy(planOwnerId);
            needList.setNotes(item.getNotes());
            needList.setCreatedDate(LocalDateTime.now());
            needList.setStatus(NeedListStatus.CREATED);

            NeedList savedNeedList = needListRepository.save(needList);

            auditLogService.createLog(
                    manager.getId(),
                    manager.getFullName(),
                    AuditActionType.NEED_LIST_CREATED,
                    "NeedList",
                    savedNeedList.getId(),
                    manager.getFullName() + " Plan #" + planId + " için ekstra ürün ekledi. Kayıt ID: " + savedNeedList.getId()
            );

            result.add(convertToResponse(savedNeedList));
        }

        return result;
    }

    // Çağıranın var olan ve MAGAZA_MUDURU rolünde bir kullanıcı olduğunu doğrular.
    // Yalnızca mevcut bir plana ekstra ürün ekleme (addExtraItemsToPlan) için kullanılır.
    private User requireManager(Long userId) {
        if (userId == null) {
            throw new RuntimeException("Kullanıcı kimliği gereklidir");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        if (user.getRole() != UserRole.MAGAZA_MUDURU) {
            throw new RuntimeException("Bu işlem için mağaza müdürü yetkisi gereklidir");
        }

        return user;
    }

    // Çağıranın var olan ve MAGAZA_PERSONELI rolünde bir kullanıcı olduğunu doğrular.
    // ADMIN dahil başka hiçbir rol ihtiyaç planı oluşturamaz/iptal edemez.
    private User requireCreator(Long userId) {
        if (userId == null) {
            throw new RuntimeException("Kullanıcı kimliği gereklidir");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        if (user.getRole() != UserRole.MAGAZA_PERSONELI) {
            throw new RuntimeException("Bu işlem için mağaza personeli yetkisi gereklidir");
        }

        return user;
    }
}
