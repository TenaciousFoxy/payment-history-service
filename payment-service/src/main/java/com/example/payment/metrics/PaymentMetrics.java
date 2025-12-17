package com.example.payment.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PaymentMetrics {

    private final MeterRegistry meterRegistry;
    private Counter mockPaymentRequestCounter;
    private Counter paymentSaveCounter;

    @PostConstruct
    public void init() {
        mockPaymentRequestCounter = Counter.builder("payment.mock.requests.total")
                .description("Total number of mock payment requests")
                .register(meterRegistry);

        paymentSaveCounter = Counter.builder("payment.saves.total")
                .description("Total number of payments saved to database")
                .register(meterRegistry);
    }

    public void incrementMockPaymentRequests() {
        mockPaymentRequestCounter.increment();
    }

    public void incrementPaymentSaves() {
        paymentSaveCounter.increment();
    }
}
