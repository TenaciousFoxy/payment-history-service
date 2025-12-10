package com.example.payment.service;

import com.example.payment.dto.PaymentDto;
import com.example.payment.entity.PaymentEntity;
import com.example.payment.metrics.PaymentMetrics;
import com.example.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final MockPaymentService mockPaymentService;
    private final PaymentMetrics paymentMetrics;

    /**
     * Получить платеж из заглушки и сохранить в БД
     * с оптимизированными транзакциями и retry логикой
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, timeout = 5)
    public Mono<PaymentEntity> fetchAndSavePayment() {
        return mockPaymentService.getRandomPayment()
                .flatMap(this::convertToEntity)
                .flatMap(this::savePaymentWithRetry)  // Используем новый метод с retry
                .doOnSuccess(payment -> {
                    log.info("Payment saved successfully: {}", payment.getTransactionId());
                    paymentMetrics.incrementPaymentSaves();
                })
                .doOnError(error -> {
                    log.error("Error saving payment after all retries: {}", error.getMessage());
                    // Не логируем stack trace для Transient ошибок
                    if (!(error instanceof TransientDataAccessException)) {
                        log.error("Stack trace:", error);
                    }
                });
    }

    /**
     * Сохранить платеж с retry логикой для временных ошибок
     */
    private Mono<PaymentEntity> savePaymentWithRetry(PaymentEntity entity) {
        return paymentRepository.save(entity)
                .retryWhen(Retry.backoff(3, Duration.ofMillis(100))
                        .filter(this::isRetryableError)
                        .doBeforeRetry(retrySignal ->
                                log.warn("Retry attempt {} for payment: {}",
                                        retrySignal.totalRetries() + 1,
                                        entity.getTransactionId())
                        )
                        .onRetryExhaustedThrow((retryBackoffSpec, retrySignal) -> {
                            log.error("All retries exhausted for payment: {}",
                                    entity.getTransactionId());
                            return retrySignal.failure();
                        }));
    }

    /**
     * Проверяем, является ли ошибка временной и подлежит ли retry
     */
    private boolean isRetryableError(Throwable error) {
        return error instanceof TransientDataAccessException ||
                error instanceof DataAccessResourceFailureException ||
                (error.getMessage() != null &&
                        (error.getMessage().contains("timeout") ||
                                error.getMessage().contains("connection") ||
                                error.getMessage().contains("lock")));
    }


    /**
     * Получить последние платежи из БД
     */
    public Flux<PaymentEntity> getLatestPayments(int limit) {
        return paymentRepository.findLatestPayments(limit)
                .doOnSubscribe(sub -> log.debug("Fetching latest {} payments", limit))
                .doOnComplete(() -> log.debug("Successfully fetched latest payments"));
    }

    /**
     * Получить все платежи
     */
    public Flux<PaymentEntity> getAllPayments() {
        return paymentRepository.findAll()
                .doOnSubscribe(sub -> log.debug("Fetching all payments"));
    }

    /**
     * Получить платеж по ID
     */
    public Mono<PaymentEntity> getPaymentById(String id) {
        try {
            UUID uuid = UUID.fromString(id);
            return paymentRepository.findById(uuid)
                    .switchIfEmpty(Mono.error(new RuntimeException("Payment not found with id: " + id)));
        } catch (IllegalArgumentException e) {
            return Mono.error(new RuntimeException("Invalid UUID format: " + id));
        }
    }

    /**
     * Конвертировать DTO в Entity
     */
    private Mono<PaymentEntity> convertToEntity(PaymentDto dto) {
        return Mono.fromCallable(() -> {
            PaymentEntity entity = PaymentEntity.builder()
                    .amount(dto.getAmount())
                    .currency(dto.getCurrency())
                    .description(dto.getDescription())
                    .status(dto.getStatus())
                    .payerName(dto.getPayerName())
                    .payerEmail(dto.getPayerEmail())
                    .recipientName(dto.getRecipientName())
                    .recipientAccount(dto.getRecipientAccount())
                    .transactionId(dto.getTransactionId())
                    .createdAt(dto.getCreatedAt())
                    .updatedAt(dto.getUpdatedAt())
                    .build();

            // ВАЖНО: вызываем markAsNew() который установит isNew = true
            entity.markAsNew();
            return entity;
        });
    }

    /**
     * Сохранить платеж в БД
     */
    private Mono<PaymentEntity> savePayment(PaymentEntity entity) {
        return paymentRepository.save(entity)
                .doOnSuccess(savedEntity -> {
                    // После сохранения помечаем как "не новую"
                    savedEntity.markAsNotNew();
                    log.info("Payment saved with ID: {}", savedEntity.getId());
                });
    }
}