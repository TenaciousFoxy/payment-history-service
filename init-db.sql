CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY,
    amount DECIMAL(19,2),
    currency VARCHAR(10),
    description TEXT,
    status VARCHAR(50),
    payer_name VARCHAR(255),
    payer_email VARCHAR(255),
    recipient_name VARCHAR(255),
    recipient_account VARCHAR(255),
    transaction_id VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
