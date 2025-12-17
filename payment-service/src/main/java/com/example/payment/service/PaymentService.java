package com.example.payment.service;

import com.example.payment.dto.PaymentDto;
import com.example.payment.entity.PaymentEntity;
import com.example.payment.metrics.PaymentMetrics;
import com.example.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.TransientDataAccessException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
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
    private final PaymentMetrics paymentMetrics;
    private final WebClient webClient;
    
    @Value("${mock.service.url:http://localhost:8081}")
    private String mockServiceUrl;

    @Transactional(propagation = Propagation.REQUIRES_NEW, timeout = 5)
    public Mono<PaymentEntity> fetchAndSavePayment() {
        log.info("Fetching payment from external service: {}/api/mock/payment", mockServiceUrl);
        
        return webClient.get()
                .uri(mockServiceUrl + "/api/mock/payment")
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(PaymentDto.class)
                .retryWhen(Retry.backoff(3, Duration.ofMillis(100))
                        .filter(this::isRetryableError))
                .flatMap(this::convertToEntity)
                .flatMap(this::savePaymentWithRetry)
                .doOnSuccess(payment -> {
                    log.info("Payment saved successfully: {}", payment.getTransactionId());
                    paymentMetrics.incrementPaymentSaves();
                })
                .doOnError(error -> {
                    log.error("Error saving payment: {}", error.getMessage());
                    if (!(error instanceof TransientDataAccessException)) {
                        log.error("Stack trace:", error);
                    }
                });
    }

    private Mono<PaymentEntity> savePaymentWithRetry(PaymentEntity entity) {
        return paymentRepository.save(entity)
                .retryWhen(Retry.backoff(3, Duration.ofMillis(100))
                        .filter(this::isRetryableError)
                        .doBeforeRetry(retrySignal ->
                                log.warn("Retry attempt {} for payment: {}",
                                        retrySignal.totalRetries() + 1,
                                        entity.getTransactionId())
                        ));
    }

    private boolean isRetryableError(Throwable error) {
        return error instanceof TransientDataAccessException ||
                error instanceof DataAccessResourceFailureException ||
                (error.getMessage() != null &&
                        (error.getMessage().contains("timeout") ||
                                error.getMessage().contains("connection") ||
                                error.getMessage().contains("lock")));
    }

    public Flux<PaymentEntity> getLatestPayments(int limit) {
        return paymentRepository.findLatestPayments(limit)
                .doOnSubscribe(sub -> log.debug("Fetching latest {} payments", limit))
                .doOnComplete(() -> log.debug("Successfully fetched latest payments"));
    }

    public Flux<PaymentEntity> getAllPayments() {
        return paymentRepository.findAll()
                .doOnSubscribe(sub -> log.debug("Fetching all payments"));
    }

    public Mono<PaymentEntity> getPaymentById(String id) {
        try {
            UUID uuid = UUID.fromString(id);
            return paymentRepository.findById(uuid)
                    .switchIfEmpty(Mono.error(new RuntimeException("Payment not found with id: " + id)));
        } catch (IllegalArgumentException e) {
            return Mono.error(new RuntimeException("Invalid UUID format: " + id));
        }
    }

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

            entity.markAsNew();
            return entity;
        });
    }
}
