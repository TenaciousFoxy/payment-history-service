package com.example.payment;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.r2dbc.repository.config.EnableR2dbcRepositories;

@Slf4j
@SpringBootApplication
@EnableR2dbcRepositories
public class PaymentServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(PaymentServiceApplication.class, args);
		log.info("Payment Service started on port 8080!");
		log.info("Swagger UI: http://localhost:8080/swagger-ui.html");
		log.info("Fetch and save: POST http://localhost:8080/api/payments/fetch-and-save");
		log.info("Get latest: GET http://localhost:8080/api/payments?limit=10");
	}
}
