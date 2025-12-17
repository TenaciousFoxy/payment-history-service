package com.example.payment.service;

import com.example.payment.dto.PaymentDto;
import com.example.payment.entity.PaymentEntity;
import com.example.payment.metrics.PaymentMetrics;
import com.example.payment.repository.PaymentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final PaymentMetrics paymentMetrics;

    @Value("${mock.service.url}")
    private String mockServiceUrl;

    /**
     * Получить платеж из внешнего сервиса и сохранить в БД
     * Асинхронный подход: параллельное выполнение HTTP-запроса и операции БД
     */
    public Mono<PaymentEntity> fetchAndSavePayment() {
        return fetchPaymentFromMockService()
                .doOnNext(dto -> {
                    log.debug("Fetched payment from mock service: {}", dto.getTransactionId());
                    paymentMetrics.incrementMockPaymentRequests();
                })
                .flatMap(this::savePayment)
                .doOnNext(payment -> {
                    log.debug("Payment saved: {}", payment.getTransactionId());
                    paymentMetrics.incrementPaymentSaves();
                });
    }

    /**
     * Асинхронный запрос к внешнему сервису
     */
    private Mono<PaymentDto> fetchPaymentFromMockService() {
        return webClient.get()
                .uri(mockServiceUrl + "/api/mock/payment")
                .retrieve()
                .bodyToMono(String.class)
                .flatMap(json -> {
                    try {
                        PaymentDto dto = objectMapper.readValue(json, PaymentDto.class);
                        return Mono.just(dto);
                    } catch (Exception e) {
                        log.error("Error parsing payment JSON: {}", json, e);
                        return Mono.error(e);
                    }
                })
                .doOnError(error -> log.error("Error fetching payment from mock service", error))
                .onErrorResume(error -> Mono.empty()); // Возвращаем пустой Mono при ошибке
    }

    /**
     * Асинхронное сохранение платежа в БД
     */
    private Mono<PaymentEntity> savePayment(PaymentDto dto) {
        return paymentRepository.existsByTransactionId(dto.getTransactionId())
                .flatMap(exists -> {
                    if (exists) {
                        log.info("Payment with transactionId {} already exists", dto.getTransactionId());
                        return Mono.empty(); // Пропускаем дубликаты
                    }

                    PaymentEntity entity = convertToEntity(dto);
                    entity.markAsNew();

                    return paymentRepository.save(entity)
                            .doOnSuccess(saved ->
                                    log.debug("Payment saved successfully: {}", saved.getTransactionId())
                            )
                            .doOnError(error ->
                                    log.error("Error saving payment: {}", dto.getTransactionId(), error)
                            );
                });
    }

    /**
     * Получить последние платежи из БД
     */
    public Mono<PaymentEntity> getLatestPayments(int limit) {
        return paymentRepository.findLatestPayments(limit)
                .collectList()
                .flatMap(list -> {
                    if (list.isEmpty()) {
                        return Mono.empty();
                    }
                    return Mono.just(list.get(0)); // Возвращаем первый элемент для примера
                });
    }

    /**
     * Получить все платежи (для контроллера)
     */
    public reactor.core.publisher.Flux<PaymentEntity> getAllPayments() {
        return paymentRepository.findAll();
    }

    /**
     * Получить платеж по ID
     */
    public Mono<PaymentEntity> getPaymentById(String id) {
        return paymentRepository.findById(java.util.UUID.fromString(id));
    }

    /**
     * Конвертация DTO в Entity
     */
    private PaymentEntity convertToEntity(PaymentDto dto) {
        return PaymentEntity.builder()
                .id(dto.getId() != null ? dto.getId() : java.util.UUID.randomUUID())
                .amount(dto.getAmount() != null ? dto.getAmount() : BigDecimal.ZERO)
                .currency(dto.getCurrency() != null ? dto.getCurrency() : "RUB")
                .description(dto.getDescription() != null ? dto.getDescription() : "Mock payment")
                .status(dto.getStatus() != null ? dto.getStatus() : "PENDING")
                .payerName(dto.getPayerName() != null ? dto.getPayerName() : "Unknown")
                .payerEmail(dto.getPayerEmail() != null ? dto.getPayerEmail() : "unknown@example.com")
                .recipientName(dto.getRecipientName() != null ? dto.getRecipientName() : "Unknown")
                .recipientAccount(dto.getRecipientAccount() != null ? dto.getRecipientAccount() : "")
                .transactionId(dto.getTransactionId() != null ? dto.getTransactionId() :
                        "TXN" + System.currentTimeMillis())
                .createdAt(dto.getCreatedAt() != null ? dto.getCreatedAt() : java.time.LocalDateTime.now())
                .updatedAt(dto.getUpdatedAt() != null ? dto.getUpdatedAt() : java.time.LocalDateTime.now())
                .build();
    }
}