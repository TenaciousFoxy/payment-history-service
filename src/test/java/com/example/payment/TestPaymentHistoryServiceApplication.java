package com.example.payment;

import org.springframework.boot.SpringApplication;

public class TestPaymentHistoryServiceApplication {

	public static void main(String[] args) {
		SpringApplication.from(PaymentHistoryServiceApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
