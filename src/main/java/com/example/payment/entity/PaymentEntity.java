package com.example.payment.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.domain.Persistable;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("payments")
public class PaymentEntity implements Persistable<UUID> {

    @Id
    private UUID id;

    private BigDecimal amount;
    private String currency;
    private String description;
    private String status;

    @Column("payer_name")
    private String payerName;

    @Column("payer_email")
    private String payerEmail;

    @Column("recipient_name")
    private String recipientName;

    @Column("recipient_account")
    private String recipientAccount;

    @Column("transaction_id")
    private String transactionId;

    @Column("created_at")
    private LocalDateTime createdAt;

    @Column("updated_at")
    private LocalDateTime updatedAt;

    @Transient
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew;
    }

    // Метод, который нужно вызывать перед сохранением
    public void markAsNew() {
        this.isNew = true;
        if (this.id == null) {
            this.id = UUID.randomUUID();
        }
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        this.updatedAt = LocalDateTime.now();
    }

    // После сохранения
    public void markAsNotNew() {
        this.isNew = false;
    }
}