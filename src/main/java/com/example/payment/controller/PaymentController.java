package com.example.payment.controller;

import com.example.payment.entity.PaymentEntity;
import com.example.payment.service.PaymentService;
import io.micrometer.core.annotation.Timed;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Slf4j
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Tag(name = "Payments", description = "API для работы с платежами")
public class PaymentController {

    private final PaymentService paymentService;

    @Timed(value = "payment.fetch.save.time", description = "Time to fetch and save payment")
    @Operation(summary = "Получить платеж из заглушки и сохранить в БД")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Платеж успешно сохранен"),
            @ApiResponse(responseCode = "500", description = "Ошибка сервера")
    })
    @PostMapping(value = "/fetch-and-save", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<PaymentEntity> fetchAndSavePayment() {
        log.info("Received request to fetch and save payment");
        return paymentService.fetchAndSavePayment()
                .doOnSuccess(payment ->
                        log.info("Payment saved with ID: {}", payment.getTransactionId())
                );
    }

    @Timed(value = "payment.get.latest.time", description = "Time to get latest payments")
    @Operation(summary = "Получить последние платежи из БД")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Список платежей"),
            @ApiResponse(responseCode = "500", description = "Ошибка сервера")
    })
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    public Flux<PaymentEntity> getLatestPayments(
            @RequestParam(value = "limit", defaultValue = "10") int limit) {
        log.info("Received request for latest {} payments", limit);
        return paymentService.getLatestPayments(limit)
                .doOnComplete(() -> log.info("Successfully returned latest payments"));
    }

    @Operation(summary = "Получить все платежи из БД")
    @GetMapping(value = "/all", produces = MediaType.APPLICATION_JSON_VALUE)
    public Flux<PaymentEntity> getAllPayments() {
        log.info("Received request for all payments");
        return paymentService.getAllPayments();
    }

    @Operation(summary = "Получить платеж по ID")
    @GetMapping(value = "/{id}", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<PaymentEntity> getPaymentById(@PathVariable String id) {
        log.info("Received request for payment with ID: {}", id);
        return paymentService.getPaymentById(id);
    }
}