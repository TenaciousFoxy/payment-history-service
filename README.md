# Payment History Service

Микросервис для управления историей платежей с использованием:
- Java 21
- Spring WebFlux (реактивный стек)
- R2DBC (реактивный доступ к БД)
- PostgreSQL
- Docker
- Prometheus + Grafana для мониторинга

## Архитектура

Проект состоит из:
1. **Mock Service** - заглушка, возвращающая случайные платежи с задержкой 200мс
2. **Main Service** - основное приложение с API для получения и сохранения платежей
3. **База данных** - PostgreSQL для хранения истории платежей
4. **Мониторинг** - Prometheus + Grafana для метрик

## Запуск

```bash
# Запуск всех сервисов
docker-compose up -d

# Остановка
docker-compose down
API Endpoints

GET /api/mock/payment - получить случайный платеж из заглушки
POST /api/payments/fetch-and-save - запросить платеж из заглушки и сохранить в БД
GET /api/payments - получить последние платежи из БД
GET /actuator/prometheus - метрики для Prometheus
GET /swagger-ui.html - Swagger UI документация
Нагрузочное тестирование

bash
# Запуск теста k6
k6 run scripts/load-test.js
