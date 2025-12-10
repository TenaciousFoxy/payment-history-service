package com.example.payment.controller;

import com.example.payment.dto.PaymentDto;
import com.example.payment.metrics.PaymentMetrics;
import com.example.payment.service.MockPaymentService;
import io.micrometer.core.annotation.Timed;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@Slf4j
@RestController
@RequestMapping("/api/mock")
@RequiredArgsConstructor
public class MockController {

    private final MockPaymentService mockPaymentService;
    private final PaymentMetrics paymentMetrics;

    @Timed(value = "mock.payment.request.time", description = "Time taken to generate mock payment")
    @GetMapping(value = "/payment", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<PaymentDto> getMockPayment() {
        log.info("Received request for mock payment");
        paymentMetrics.incrementMockPaymentRequests();

        return mockPaymentService.getRandomPayment()
                .doOnSuccess(payment ->
                        log.info("Successfully generated payment with ID: {}", payment.getTransactionId())
                )
                .doOnError(error ->
                        log.error("Error generating payment: {}", error.getMessage())
                );
    }
}