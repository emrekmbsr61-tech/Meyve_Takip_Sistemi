package com.emre.meyvetakipsistemi.acceptance;

import com.emre.meyvetakipsistemi.acceptance.dto.AcceptanceItemRequest;
import com.emre.meyvetakipsistemi.acceptance.dto.AcceptanceRequest;
import com.emre.meyvetakipsistemi.auditlog.AuditActionType;
import com.emre.meyvetakipsistemi.auditlog.AuditLogService;
import com.emre.meyvetakipsistemi.needlist.NeedList;
import com.emre.meyvetakipsistemi.needlist.NeedListRepository;
import com.emre.meyvetakipsistemi.needlist.NeedListStatus;
import com.emre.meyvetakipsistemi.task.TaskAssignment;
import com.emre.meyvetakipsistemi.task.TaskAssignmentRepository;
import com.emre.meyvetakipsistemi.task.TaskStatus;
import com.emre.meyvetakipsistemi.task.TaskType;
import com.emre.meyvetakipsistemi.user.User;
import com.emre.meyvetakipsistemi.user.UserRepository;
import com.emre.meyvetakipsistemi.user.UserRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class AcceptanceService {
    private final AcceptanceRepository acceptanceRepository;
    private final AcceptanceItemRepository itemRepository;
    private final NeedListRepository needListRepository;
    private final UserRepository userRepository;
    private final TaskAssignmentRepository taskAssignmentRepository;
    private final AuditLogService auditLogService;

    public AcceptanceService(
            AcceptanceRepository acceptanceRepository,
            AcceptanceItemRepository itemRepository,
            NeedListRepository needListRepository,
            UserRepository userRepository,
            TaskAssignmentRepository taskAssignmentRepository,
            AuditLogService auditLogService
    ) {
        this.acceptanceRepository = acceptanceRepository;
        this.itemRepository = itemRepository;
        this.needListRepository = needListRepository;
        this.userRepository = userRepository;
        this.taskAssignmentRepository = taskAssignmentRepository;
        this.auditLogService = auditLogService;
    }

    /*
      Doğrulama iki aşamada yapılır: önce hiçbir kayıt yazılmadan bütün kalemler
      ve görev/kullanıcı kontrolleri tamamlanır, sonra kayıtlar oluşturulur.
      Bu sayede bir kalem geçersizse (veya görev bu kullanıcıya ait değilse,
      ya da aynı ürün için ikinci kez kabul gönderilmeye çalışılıyorsa)
      veritabanına hiçbir şey yazılmaz.
    */
    @Transactional
    public Acceptance create(AcceptanceRequest request) {
        if (request.getPlanId() == null || request.getReceivedBy() == null
                || request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("Plan, teslim alan kullanıcı ve ürünler zorunludur.");
        }

        User receiver = requireStorePersonnel(request.getReceivedBy());
        TaskAssignment kabulTask = requireAssignedActiveKabulTask(request.getPlanId(), receiver);

        // 1. Aşama: hiçbir kayıt yazılmadan önce bütün kalemler doğrulanır.
        Set<Long> submittedFruitIds = new HashSet<>();
        List<NeedList> validatedNeeds = new ArrayList<>();

        for (AcceptanceItemRequest requestItem : request.getItems()) {
            NeedList need = needListRepository.findById(requestItem.getNeedListId())
                    .orElseThrow(() -> new IllegalArgumentException("İhtiyaç kaydı bulunamadı."));

            if (!need.getPlanId().equals(request.getPlanId())) {
                throw new IllegalArgumentException("Ürün seçilen plana ait değil.");
            }

            if (!submittedFruitIds.add(need.getFruitId())) {
                throw new IllegalArgumentException("Aynı ürün birden fazla kez gönderildi.");
            }

            if (itemRepository.existsByPlanIdAndFruitId(request.getPlanId(), need.getFruitId())) {
                throw new IllegalArgumentException("Bu ürün için mal kabul zaten kaydedilmiş.");
            }

            double accepted = requestItem.getAcceptedQuantity() == null ? 0 : requestItem.getAcceptedQuantity();
            double rejected = requestItem.getRejectedQuantity() == null ? 0 : requestItem.getRejectedQuantity();

            if (accepted < 0 || rejected < 0 || accepted + rejected > need.getRequiredQuantity()) {
                throw new IllegalArgumentException("Kabul ve red miktarları beklenen miktarı geçemez.");
            }

            validatedNeeds.add(need);
        }

        // 2. Aşama: doğrulama tamamlandığına göre kayıtlar güvenle oluşturulabilir.
        Acceptance acceptance = new Acceptance();
        acceptance.setPlanId(request.getPlanId());
        acceptance.setReceivedBy(request.getReceivedBy());
        Acceptance saved = acceptanceRepository.save(acceptance);

        for (int i = 0; i < request.getItems().size(); i++) {
            AcceptanceItemRequest requestItem = request.getItems().get(i);
            NeedList need = validatedNeeds.get(i);

            double accepted = requestItem.getAcceptedQuantity() == null ? 0 : requestItem.getAcceptedQuantity();
            double rejected = requestItem.getRejectedQuantity() == null ? 0 : requestItem.getRejectedQuantity();

            AcceptanceItem item = new AcceptanceItem();
            item.setAcceptanceId(saved.getId());
            item.setPlanId(request.getPlanId());
            item.setNeedListId(need.getId());
            item.setFruitId(need.getFruitId());
            item.setExpectedQuantity(need.getRequiredQuantity());
            item.setAcceptedQuantity(accepted);
            item.setRejectedQuantity(rejected);
            item.setDamaged(Boolean.TRUE.equals(requestItem.getDamaged()));
            item.setRejectionReason(requestItem.getRejectionReason());
            itemRepository.save(item);

            need.setStatus(NeedListStatus.APPROVED);
            needListRepository.save(need);
        }

        kabulTask.setStatus(TaskStatus.COMPLETED);
        taskAssignmentRepository.save(kabulTask);

        // Log, tüm kayıtlar başarıyla yazıldıktan ve görev tamamlandıktan sonra
        // atılır (Purchase/Collection ile aynı desen); bir hata olsaydı yöntem
        // burayı görmeden exception fırlatıp @Transactional ile geri alınırdı,
        // bu yüzden başarısız işlem için asla sahte bir "başarılı" log oluşmaz.
        auditLogService.createLog(
                receiver.getId(),
                receiver.getFullName(),
                AuditActionType.ACCEPTANCE_CREATED,
                "Acceptance",
                request.getPlanId(),
                receiver.getFullName() + " Plan #" + request.getPlanId() + " için "
                        + request.getItems().size() + " ürünlük mal kabul kaydetti."
        );

        return saved;
    }

    // Çağıranın var olan ve MAGAZA_PERSONELI rolünde bir kullanıcı olduğunu doğrular.
    private User requireStorePersonnel(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Kullanıcı bulunamadı."));

        if (user.getRole() != UserRole.MAGAZA_PERSONELI) {
            throw new IllegalArgumentException("Bu işlem için mağaza personeli yetkisi gereklidir.");
        }

        return user;
    }

    /*
      Planın KABUL (ACCEPTANCE) görevinin var olduğunu, bu kullanıcıya atandığını
      ve henüz COMPLETED olmadığını (yalnızca PENDING/IN_PROGRESS iken kabul
      tamamlanabilir) doğrular.
    */
    private TaskAssignment requireAssignedActiveKabulTask(Long planId, User receiver) {
        TaskAssignment kabulTask = taskAssignmentRepository
                .findByPlanIdAndTaskType(planId, TaskType.ACCEPTANCE)
                .orElseThrow(() -> new IllegalArgumentException("Bu plan için aktif bir kabul görevi bulunamadı."));

        if (!receiver.getId().equals(kabulTask.getAssignedUserId())) {
            throw new IllegalArgumentException("Bu kabul görevi size atanmamış.");
        }

        if (kabulTask.getStatus() == TaskStatus.COMPLETED) {
            throw new IllegalArgumentException("Bu plan için mal kabul zaten tamamlanmış.");
        }

        return kabulTask;
    }
}