package com.emre.meyvetakipsistemi.collection;

import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditLogService;
import com.emre.meyvetakipsistemi.collection.dto.*;
import com.emre.meyvetakipsistemi.deliveryplan.DeliveryPlanService;
import com.emre.meyvetakipsistemi.fruit.Fruit;
import com.emre.meyvetakipsistemi.fruit.FruitRepository;
import com.emre.meyvetakipsistemi.needlist.NeedList;
import com.emre.meyvetakipsistemi.needlist.NeedListRepository;
import com.emre.meyvetakipsistemi.purchase.Purchase;
import com.emre.meyvetakipsistemi.purchase.PurchaseRepository;
import com.emre.meyvetakipsistemi.supplier.Supplier;
import com.emre.meyvetakipsistemi.supplier.SupplierRepository;
import com.emre.meyvetakipsistemi.task.TaskAssignment;
import com.emre.meyvetakipsistemi.task.TaskAssignmentRepository;
import com.emre.meyvetakipsistemi.task.TaskStatus;
import com.emre.meyvetakipsistemi.task.TaskType;
import com.emre.meyvetakipsistemi.user.User;
import com.emre.meyvetakipsistemi.user.UserRepository;
import com.emre.meyvetakipsistemi.user.UserRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

// ŞOFÖR'ün toplama (Collection) işlemlerine ait iş mantığını yönetir.
@Service
public class CollectionService {

    /*
      KABUL görevi için süre standardı. PurchaseService'teki TASK_DEADLINE_HOURS
      ile aynı geçici varsayımdır (meyveye göre değişen gerçek bir kural yok).
    */
    private static final int TASK_DEADLINE_HOURS = 4;

    private final CollectionRepository collectionRepository;
    private final NeedListRepository needListRepository;
    private final FruitRepository fruitRepository;
    private final PurchaseRepository purchaseRepository;
    private final SupplierRepository supplierRepository;
    private final UserRepository userRepository;
    private final DeliveryPlanService deliveryPlanService;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final AuditLogService auditLogService;

    public CollectionService(
            CollectionRepository collectionRepository,
            NeedListRepository needListRepository,
            FruitRepository fruitRepository,
            PurchaseRepository purchaseRepository,
            SupplierRepository supplierRepository,
            UserRepository userRepository,
            DeliveryPlanService deliveryPlanService,
            TaskAssignmentRepository taskAssignmentRepository,
            AuditLogService auditLogService
    ) {
        this.collectionRepository = collectionRepository;
        this.needListRepository = needListRepository;
        this.fruitRepository = fruitRepository;
        this.purchaseRepository = purchaseRepository;
        this.supplierRepository = supplierRepository;
        this.userRepository = userRepository;
        this.deliveryPlanService = deliveryPlanService;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.auditLogService = auditLogService;
    }

    /*
      Şoförün, kendisine atanmış bir TOPLAMA görevi için görebileceği güvenli plan
      detayını döner. Purchase kaydına yalnızca tedarikçi bilgisini okumak için
      bakılır; purchasedQuantity/unitPrice/totalPrice/salesPrice hiçbir zaman
      response'a taşınmaz (bkz. buildCollectionPlanItem).
    */
    public CollectionPlanDetailResponse getCollectionPlanDetail(Long driverId, Long planId) {
        User driver = requireDriver(driverId);
        TaskAssignment toplamaTask = requireOwnToplamaTask(planId, driver);

        List<NeedList> needs = needListRepository.findByPlanId(planId);

        if (needs.isEmpty()) {
            throw new RuntimeException("Bu plana ait ihtiyaç kaydı bulunamadı");
        }

        DeliveryPlanService.PlanStoreInfo storeInfo = deliveryPlanService.resolveStoreInfo(planId);

        // Aynı planda aynı meyve için birden fazla NeedList kaydı olabilir; Collection
        // her zaman fruitId bazında tek kayıt tuttuğu için burada da tekilleştirilir.
        Set<Long> planFruitIds = needs.stream()
                .map(NeedList::getFruitId)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        List<CollectionPlanItemResponse> items = planFruitIds.stream()
                .map(fruitId -> buildCollectionPlanItem(planId, fruitId))
                .toList();

        return new CollectionPlanDetailResponse(planId, storeInfo.storeId(), storeInfo.storeName(), items);
    }

    // Tek bir ürün için şoföre gösterilecek güvenli satırı üretir.
    private CollectionPlanItemResponse buildCollectionPlanItem(Long planId, Long fruitId) {
        Fruit fruit = fruitRepository.findById(fruitId).orElse(null);

        Supplier supplier = purchaseRepository.findByPlanId(planId).stream()
                .filter(purchase -> fruitId.equals(purchase.getFruitId()))
                .findFirst()
                .map(Purchase::getSupplierId)
                .flatMap(supplierRepository::findById)
                .orElse(null);

        return new CollectionPlanItemResponse(
                fruitId,
                fruit == null ? "Bilinmeyen meyve" : fruit.getName(),
                fruit == null ? null : fruit.getUnit(),
                supplier == null ? null : supplier.getSupplierCode(),
                supplier == null ? "Bilinmeyen tedarikçi" : supplier.getSupplierName()
        );
    }

    /*
      Bir planın tüm ürünleri için tek seferde toplama kaydı oluşturur.
      İşlem @Transactional'dır: doğrulama iki aşamada yapılır (önce hiçbir şey
      kaydetmeden bütün kalemler kontrol edilir, sonra kayıtlar oluşturulur ve
      TOPLAMA görevi tamamlanıp KABUL görevi atanır), bu sayede bir kalem
      geçersizse veya görev ataması başarısızsa veritabanına yarım kayıt yazılmaz.
    */
    @Transactional
    public CollectionResultResponse createCollectionsForPlan(CollectionPlanRequest request) {

        User driver = requireDriver(request.getCreatedBy());

        if (request.getPlanId() == null) {
            throw new RuntimeException("Plan seçilmelidir");
        }

        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new RuntimeException("En az bir ürün için toplama bilgisi girilmelidir");
        }

        TaskAssignment toplamaTask = requireOwnToplamaTask(request.getPlanId(), driver);

        if (toplamaTask.getStatus() == TaskStatus.COMPLETED) {
            throw new RuntimeException("Bu plan için toplama zaten tamamlanmış");
        }

        List<NeedList> needs = needListRepository.findByPlanId(request.getPlanId());

        if (needs.isEmpty()) {
            throw new RuntimeException("Bu plana ait ihtiyaç kaydı bulunamadı");
        }

        Set<Long> planFruitIds = needs.stream().map(NeedList::getFruitId).collect(Collectors.toSet());

        // 1. Aşama: hiçbir kayıt yazılmadan önce bütün kalemler doğrulanır.
        Set<Long> submittedFruitIds = new HashSet<>();

        for (CollectionItemRequest item : request.getItems()) {
            validateCollectionItem(item, request.getPlanId(), planFruitIds, submittedFruitIds);
        }

        /*
          Planın tüm ürünleri tek seferde gönderilmelidir. Kısmi gönderim kabul
          edilmez; aksi halde TOPLAMA görevi COMPLETED yapılırken bazı ürünler
          için hiç Collection kaydı olmayan belirsiz bir durum oluşabilir.
        */
        if (!submittedFruitIds.equals(planFruitIds)) {
            throw new RuntimeException("Planın tüm ürünleri için toplama bilgisi girilmelidir");
        }

        // 2. Aşama: doğrulama tamamlandığına göre kayıtlar güvenle oluşturulabilir.
        List<Collection> savedCollections = new ArrayList<>();

        for (CollectionItemRequest item : request.getItems()) {
            Collection collection = new Collection();
            collection.setPlanId(request.getPlanId());
            collection.setFruitId(item.getFruitId());
            collection.setCollectedQuantity(item.getCollectedQuantity());
            collection.setCollectionDate(LocalDateTime.now());
            collection.setCreatedBy(driver.getId());
            collection.setNotes(item.getNotes());

            savedCollections.add(collectionRepository.save(collection));
        }

        completeToplamaAndAssignKabul(request.getPlanId(), toplamaTask, driver);

        auditLogService.createLog(
                driver.getId(),
                driver.getFullName(),
                AuditActionType.COLLECTION_CREATED,
                "Collection",
                request.getPlanId(),
                driver.getFullName() + " Plan #" + request.getPlanId() + " için "
                        + savedCollections.size() + " ürünlük toplama kaydetti."
        );

        return new CollectionResultResponse(
                request.getPlanId(),
                savedCollections.size(),
                "Toplama kaydı tamamlandı. " + savedCollections.size() + " ürün kaydedildi."
        );
    }

    // Tek bir toplama kalemini, herhangi bir kayıt yazmadan önce baştan sona doğrular.
    private void validateCollectionItem(
            CollectionItemRequest item,
            Long planId,
            Set<Long> planFruitIds,
            Set<Long> submittedFruitIds
    ) {
        if (item.getFruitId() == null || !planFruitIds.contains(item.getFruitId())) {
            throw new RuntimeException("Gönderilen ürün bu plana ait değil");
        }

        if (!submittedFruitIds.add(item.getFruitId())) {
            throw new RuntimeException("Aynı ürün birden fazla kez gönderildi");
        }

        if (collectionRepository.existsByPlanIdAndFruitId(planId, item.getFruitId())) {
            throw new RuntimeException("Bu ürün için toplama zaten kaydedilmiş");
        }

        if (item.getCollectedQuantity() == null || item.getCollectedQuantity() <= 0) {
            throw new RuntimeException("Toplanan miktar sıfırdan büyük olmalıdır");
        }
    }

    /*
      Collection tamamlandığında:
      1) TOPLAMA görevi COMPLETED yapılır.
      2) Aynı plan için daha önce oluşturulmuş bir KABUL (ACCEPTANCE) görevi yoksa,
         planı oluşturan MAGAZA_PERSONELI kullanıcısına (bkz. resolvePlanOwner) yeni
         bir KABUL görevi atanır. PurchaseService.completeAlimTaskAndAssignToplama
         ile aynı desendir.
    */
    private void completeToplamaAndAssignKabul(Long planId, TaskAssignment toplamaTask, User driver) {
        toplamaTask.setStatus(TaskStatus.COMPLETED);
        taskAssignmentRepository.save(toplamaTask);

        auditLogService.createLog(
                driver.getId(),
                driver.getFullName(),
                AuditActionType.TASK_COMPLETED,
                "TaskAssignment",
                toplamaTask.getId(),
                "Plan #" + planId + " için TOPLAMA görevi tamamlandı."
        );

        boolean kabulTaskExists = taskAssignmentRepository
                .findByPlanIdAndTaskType(planId, TaskType.ACCEPTANCE)
                .isPresent();

        if (kabulTaskExists) {
            return;
        }

        User planOwner = resolvePlanOwner(planId);

        TaskAssignment kabulTask = new TaskAssignment();
        kabulTask.setPlanId(planId);
        kabulTask.setAssignedUserId(planOwner.getId());
        kabulTask.setAssignedAt(LocalDateTime.now());
        kabulTask.setDueDate(LocalDateTime.now().plusHours(TASK_DEADLINE_HOURS));
        kabulTask.setTaskType(TaskType.ACCEPTANCE);
        kabulTask.setStatus(TaskStatus.PENDING);

        TaskAssignment savedTask = taskAssignmentRepository.save(kabulTask);

        auditLogService.createLog(
                driver.getId(),
                driver.getFullName(),
                AuditActionType.TASK_ASSIGNED,
                "TaskAssignment",
                savedTask.getId(),
                "Plan #" + planId + " için " + planOwner.getFullName() + " kullanıcısına kabul görevi atandı."
        );
    }

    /*
      KABUL görevinin kime atanacağını belirler: aynı plana ait tüm NeedList
      kayıtlarının createdBy değeri aynı olmalıdır (bir plan her zaman tek bir
      MAGAZA_PERSONELI tarafından oluşturulur, bkz. NeedListService.requireCreator).
      Farklı createdBy değerleri varsa (beklenmeyen/bozuk veri durumu) görev
      oluşturulmaz, anlaşılır bir hata fırlatılır.
    */
    private User resolvePlanOwner(Long planId) {
        List<NeedList> needs = needListRepository.findByPlanId(planId);

        if (needs.isEmpty()) {
            throw new RuntimeException(
                    "Bu plana ait ihtiyaç kaydı bulunamadığı için kabul görevi oluşturulamadı"
            );
        }

        Set<Long> createdByIds = needs.stream()
                .map(NeedList::getCreatedBy)
                .collect(Collectors.toSet());

        if (createdByIds.size() > 1) {
            throw new RuntimeException(
                    "Bu plana ait ihtiyaç kayıtları farklı kullanıcılara ait olduğu için kabul görevi oluşturulamadı"
            );
        }

        Long ownerId = createdByIds.iterator().next();

        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException(
                        "İhtiyaç planını oluşturan kullanıcı bulunamadığı için kabul görevi oluşturulamadı"
                ));

        if (owner.getRole() != UserRole.MAGAZA_PERSONELI) {
            throw new RuntimeException(
                    "İhtiyaç planını oluşturan kullanıcının rolü mağaza personeli değil, kabul görevi oluşturulamadı"
            );
        }

        return owner;
    }

    // Çağıranın var olan ve SOFOR rolünde bir kullanıcı olduğunu doğrular.
    private User requireDriver(Long userId) {
        if (userId == null) {
            throw new RuntimeException("Kullanıcı kimliği gereklidir");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        if (user.getRole() != UserRole.SOFOR) {
            throw new RuntimeException("Bu işlem için şoför yetkisi gereklidir");
        }

        return user;
    }

    // Planın aktif bir TOPLAMA görevi olduğunu ve bu görevin çağıran şoföre ait
    // olduğunu doğrular (başka bir şoförün görevini tamamlamayı engeller).
    private TaskAssignment requireOwnToplamaTask(Long planId, User driver) {
        TaskAssignment toplamaTask = taskAssignmentRepository
                .findByPlanIdAndTaskType(planId, TaskType.TOPLAMA)
                .orElseThrow(() -> new RuntimeException("Bu plan için aktif bir toplama görevi bulunamadı"));

        if (!driver.getId().equals(toplamaTask.getAssignedUserId())) {
            throw new RuntimeException("Bu toplama görevi size atanmamış");
        }

        return toplamaTask;
    }
}