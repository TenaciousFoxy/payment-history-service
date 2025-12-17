package com.example.payment.repository;

import com.example.payment.entity.PaymentEntity;
import org.springframework.data.r2dbc.repository.Query;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.UUID;

@Repository
public interface PaymentRepository extends ReactiveCrudRepository<PaymentEntity, UUID> {

    Flux<PaymentEntity> findByStatus(String status);

    @Query("SELECT * FROM payments ORDER BY created_at DESC LIMIT :limit")
    Flux<PaymentEntity> findLatestPayments(int limit);

    Flux<PaymentEntity> findByPayerEmail(String payerEmail);

    @Query("SELECT COUNT(*) > 0 FROM payments WHERE transaction_id = :transactionId")
    Mono<Boolean> existsByTransactionId(String transactionId);
}
