.PHONY: help all build build-frontend up down clean test-api test-full status logs restart reset-db

# Цвета
GREEN=\033[0;32m
YELLOW=\033[1;33m
RED=\033[0;31m
BLUE=\033[0;34m
NC=\033[0m

help:
	@echo "${BLUE}=== Payment Services ===${NC}"
	@echo ""
	@echo "${GREEN}Основные команды:${NC}"
	@echo "  make all            - Полный цикл: сборка → запуск → тест"
	@echo "  make build          - Собрать все сервисы"
	@echo "  make build-frontend - Собрать только фронтенд"
	@echo "  make up             - Запустить всё"
	@echo "  make down           - Остановить всё"
	@echo "  make restart        - Перезапустить"
	@echo ""
	@echo "${YELLOW}Тестирование:${NC}"
	@echo "  make test-api      - Быстрый тест API"
	@echo "  make test-full     - Полный нагрузочный тест"
	@echo "  make status        - Статус сервисов"
	@echo "  make logs          - Логи сервера"
	@echo ""
	@echo "${RED}Очистка:${NC}"
	@echo "  make clean         - Полная очистка"
	@echo "  reset-db           - Очистка БД"
	@echo ""
	@echo "${BLUE}Доступ:${NC}"
	@echo "  Frontend:    http://localhost:3000"
	@echo "  Payment API: http://localhost:8080"
	@echo "  Mock API:    http://localhost:8081"
	@echo "  Swagger:     http://localhost:8080/swagger-ui.html"

# Полный цикл
all: build up test-api
	@echo ""
	@echo "${GREEN}✅ Всё готово!${NC}"
	@echo "${BLUE}Frontend:    http://localhost:3000${NC}"
	@echo "${BLUE}Payment API: http://localhost:8080${NC}"
	@echo "${BLUE}Mock API:    http://localhost:8081${NC}"

# Сборка всех сервисов
build:
	@echo "${BLUE}🔨 Сборка всех сервисов...${NC}"
	@echo "${YELLOW}1. Сборка mock-payment-service...${NC}"
	@cd mock-payment-service && ./mvnw clean package -DskipTests >/dev/null 2>&1 && echo "${GREEN}   ✅ Собран${NC}" || { echo "${RED}   ❌ Ошибка${NC}"; exit 1; }
	@echo "${YELLOW}2. Сборка payment-service...${NC}"
	@cd payment-service && ./mvnw clean package -DskipTests >/dev/null 2>&1 && echo "${GREEN}   ✅ Собран${NC}" || { echo "${RED}   ❌ Ошибка${NC}"; exit 1; }
	@echo "${YELLOW}3. Сборка фронтенда...${NC}"
	@cd frontend && npm install >/dev/null 2>&1 && echo "${GREEN}   ✅ Зависимости установлены${NC}" || echo "${YELLOW}   ⚠️  Пропущена установка npm${NC}"
	@echo "${GREEN}✅ Все сервисы собраны${NC}"

# Сборка только фронтенда
build-frontend:
	@echo "${BLUE}🎨 Сборка фронтенда...${NC}"
	@cd frontend && npm install && echo "${GREEN}✅ Фронтенд собран${NC}"

# Запуск
up: build
	@echo "${BLUE}🚀 Запуск всех сервисов...${NC}"
	@docker-compose up --build -d
	@echo "${YELLOW}⏳ Ожидание запуска (25 секунд)...${NC}"
	@sleep 25
	@make status

# Остановка
down:
	@echo "${RED}🛑 Остановка всех сервисов...${NC}"
	@docker-compose down -v
	@echo "${GREEN}✅ Остановлено${NC}"

# Перезапуск
restart: down up

# Очистка
clean: down
	@echo "${YELLOW}🧹 Полная очистка...${NC}"
	@docker system prune -a --volumes -f 2>/dev/null || true
	@rm -rf payment-service/target mock-payment-service/target frontend/node_modules 2>/dev/null || true
	@echo "${GREEN}✅ Очищено${NC}"

# Статус
status:
	@echo "${BLUE}📊 Статус сервисов:${NC}"
	@docker-compose ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | tail -n +2 || true
	@echo ""
	@echo "${BLUE}🌐 Проверка доступности:${NC}"
	@echo -n "Frontend (3000): "
	@curl -s -f --max-time 3 http://localhost:3000 >/dev/null 2>&1 && echo "${GREEN}✅${NC}" || echo "${RED}❌${NC}"
	@echo -n "Payment (8080):  "
	@curl -s -f --max-time 3 http://localhost:8080/actuator/health >/dev/null 2>&1 && echo "${GREEN}✅${NC}" || echo "${RED}❌${NC}"
	@echo -n "Mock (8081):     "
	@curl -s -f --max-time 3 http://localhost:8081/api/mock/payment >/dev/null 2>&1 && echo "${GREEN}✅${NC}" || echo "${RED}❌${NC}"

# Логи
logs:
	@echo "${BLUE}📄 Логи всех сервисов (Ctrl+C для выхода):${NC}"
	@docker-compose logs -f

# Тест API
test-api:
	@echo "${BLUE}🧪 Тестирование API...${NC}"
	@echo "1. Сохранение платежа:"
	@curl -s -X POST http://localhost:8080/api/payments/fetch-and-save | grep -q "transactionId" && echo "   ${GREEN}✅ Успешно${NC}" || echo "   ${RED}❌ Ошибка${NC}"
	@echo ""
	@echo "2. Чтение платежей:"
	@curl -s "http://localhost:8080/api/payments?size=5" | grep -q '"id"' && echo "   ${GREEN}✅ Доступно${NC}" || echo "   ${YELLOW}⚠️  Нет данных${NC}"
	@echo ""
	@echo "3. Swagger UI:"
	@curl -s -f http://localhost:8080/swagger-ui.html >/dev/null && echo "   ${GREEN}✅ Доступен${NC}" || echo "   ${RED}❌ Не доступен${NC}"
# Нагрузочный тест
test-full:
	@echo "${YELLOW}🧪 Запуск полного нагрузочного теста...${NC}"
	@if command -v k6 >/dev/null 2>&1; then \
		echo "Этапы теста:"; \
		echo "  1. Только запись (100 VU × 30)"; \
		echo "  2. Только чтение (100 VU × 30)"; \
		echo "  3. Запись + чтение параллельно"; \
		echo ""; \
		k6 run scripts/full-test.js; \
	else \
		echo "${RED}❌ k6 не установлен${NC}"; \
		echo "${YELLOW}Установите:${NC}"; \
		echo "  macOS: brew install k6"; \
		echo "  Linux: sudo apt-get install k6"; \
		echo "  Или скачайте: https://k6.io/docs/get-started/installation/"; \
	fi
reset-db:
	@echo "🧹 Сброс данных БД..."
	# 1. Graceful stop payment-service (дает время закрыть соединения)
	@docker-compose stop payment-service 2>/dev/null || true
	@sleep 5  # Даем время на закрытие соединений
	# 2. Подключаемся и очищаем (ВАЖНО: -c 'autocommit=on' для VACUUM)
	@docker-compose exec postgres psql -U payment_user -d payment_db \
		-c "TRUNCATE TABLE payments RESTART IDENTITY;" \
		-c "VACUUM ANALYZE;"
	# 3. Запускаем заново
	@docker-compose up -d payment-service
	@sleep 5
	@echo "✅ База очищена, сервис перезапущен"
# Тест фронтенда
test-frontend:
	@echo "${BLUE}🎨 Тест фронтенда...${NC}"
	@if curl -s -f http://localhost:3000 >/dev/null; then \
		echo "${GREEN}✅ Фронтенд работает${NC}"; \
		echo "Откройте: http://localhost:3000"; \
	else \
		echo "${RED}❌ Фронтенд не доступен${NC}"; \
	fi
