package com.example.mockpayment.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Random;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/mock")
public class MockController {
    
    private static final Random RANDOM = new Random();
    private static final String[] CURRENCIES = {"RUB", "USD", "EUR", "GBP"};
    private static final String[] STATUSES = {"PENDING", "COMPLETED", "FAILED"};
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @GetMapping(value = "/payment", produces = MediaType.APPLICATION_JSON_VALUE)
    public Mono<String> getMockPayment() {
        log.info("Generating mock payment...");
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime createdAt = now.minusMinutes(RANDOM.nextInt(1440));
        
        String paymentJson = String.format(
            "{\"id\":\"%s\",\"amount\":%.2f,\"currency\":\"%s\",\"description\":\"Mock payment\"," +
            "\"status\":\"%s\",\"payerName\":\"Иван Иванов\",\"payerEmail\":\"ivan@example.com\"," +
            "\"recipientName\":\"ООО Ромашка\",\"recipientAccount\":\"ACC%08d\"," +
            "\"transactionId\":\"TXN%d\",\"createdAt\":\"%s\",\"updatedAt\":\"%s\"}",
            UUID.randomUUID().toString(),
            100 + RANDOM.nextDouble() * 9900,
            CURRENCIES[RANDOM.nextInt(CURRENCIES.length)],
            STATUSES[RANDOM.nextInt(STATUSES.length)],
            RANDOM.nextInt(100000000),
            System.currentTimeMillis(),
            createdAt.format(FORMATTER),
            now.format(FORMATTER)
        );
        
        return Mono.just(paymentJson)
                .delayElement(Duration.ofMillis(200))
                .doOnSuccess(p -> log.info("Payment generated"));
    }
    
    @GetMapping("/actuator/health")
    public String health() {
        return "{\"status\":\"UP\"}";
    }
}
