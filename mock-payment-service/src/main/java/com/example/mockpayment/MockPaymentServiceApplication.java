package com.example.mockpayment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MockPaymentServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(MockPaymentServiceApplication.class, args);
        System.out.println("Mock Payment Service запущен на порту 8081");
        System.out.println("API: GET http://localhost:8081/api/mock/payment");
    }
}
