package com.example.payment.service;

import com.example.payment.dto.PaymentDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.UUID;

@Slf4j
@Service
public class MockPaymentService {

    private static final Random RANDOM = new Random();
    private static final List<String> CURRENCIES = Arrays.asList("RUB", "USD", "EUR", "GBP");
    private static final List<String> STATUSES = Arrays.asList("PENDING", "COMPLETED", "FAILED", "PROCESSING");
    private static final List<String> PAYER_NAMES = Arrays.asList(
            "Иван Иванов", "Алексей Петров", "Мария Сидорова", "Екатерина Смирнова",
            "Дмитрий Кузнецов", "Ольга Попова", "Сергей Васильев", "Анна Новикова"
    );
    private static final List<String> DESCRIPTIONS = Arrays.asList(
            "Оплата заказа", "Перевод между счетами", "Оплата услуг", "Возврат средств",
            "Ежемесячный платеж", "Бонусная выплата", "Корпоративный перевод"
    );

    public Mono<PaymentDto> getRandomPayment() {
        return Mono.fromCallable(this::generateRandomPayment)
                .delayElement(java.time.Duration.ofMillis(200)) // Задержка 200мс
                .doOnSubscribe(sub -> log.debug("Generating random payment..."))
                .doOnSuccess(payment -> log.debug("Payment generated: {}", payment.getTransactionId()));
    }

    private PaymentDto generateRandomPayment() {
        PaymentDto payment = new PaymentDto();
        payment.setId(UUID.randomUUID());
        payment.setAmount(generateRandomAmount());
        payment.setCurrency(CURRENCIES.get(RANDOM.nextInt(CURRENCIES.size())));
        payment.setStatus(STATUSES.get(RANDOM.nextInt(STATUSES.size())));
        payment.setPayerName(PAYER_NAMES.get(RANDOM.nextInt(PAYER_NAMES.size())));
        payment.setPayerEmail(generateEmail(payment.getPayerName()));
        payment.setRecipientName("ООО 'Ромашка'");
        payment.setRecipientAccount("ACC" + String.format("%08d", RANDOM.nextInt(100000000)));
        payment.setTransactionId("TXN" + System.currentTimeMillis() + RANDOM.nextInt(1000));
        payment.setDescription(DESCRIPTIONS.get(RANDOM.nextInt(DESCRIPTIONS.size())));
        payment.setCreatedAt(LocalDateTime.now().minusMinutes(RANDOM.nextInt(1440))); // До 24 часов назад
        payment.setUpdatedAt(LocalDateTime.now());

        return payment;
    }

    private BigDecimal generateRandomAmount() {
        double amount = 100 + (RANDOM.nextDouble() * 9900); // От 100 до 10000
        return BigDecimal.valueOf(amount).setScale(2, RoundingMode.HALF_UP);
    }

    private String generateEmail(String payerName) {
        String[] names = payerName.split(" ");
        String firstName = names[0].toLowerCase();
        String lastName = names.length > 1 ? names[1].toLowerCase() : "user";
        return firstName + "." + lastName + "@example.com";
    }
}