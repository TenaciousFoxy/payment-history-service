-- Создание расширения для UUID если нет
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Создание таблицы payments
CREATE TABLE IF NOT EXISTS payments (
                                        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    description TEXT,
    status VARCHAR(50) NOT NULL,
    payer_name VARCHAR(255),
    payer_email VARCHAR(255),
    recipient_name VARCHAR(255),
    recipient_account VARCHAR(255),
    transaction_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

-- Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON payments(transaction_id);

-- Комментарии к таблице
COMMENT ON TABLE payments IS 'Таблица для хранения истории платежей';
COMMENT ON COLUMN payments.amount IS 'Сумма платежа';
COMMENT ON COLUMN payments.currency IS 'Валюта (RUB, USD, EUR)';
COMMENT ON COLUMN payments.status IS 'Статус платежа (PENDING, COMPLETED, FAILED)';
COMMENT ON COLUMN payments.transaction_id IS 'Уникальный идентификатор транзакции';