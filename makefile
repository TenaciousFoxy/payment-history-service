.PHONY: help build up down test clean logs db-shell status test-api test-read test-write test-full all

# Переменные
DOCKER_COMPOSE = docker-compose
MAVEN = ./mvnw
SCRIPTS_DIR = scripts

# Основные команды
help:
	@echo "===================================================================="
	@echo "Payment History Service - Команды управления"
	@echo "===================================================================="
	@echo ""
	@echo "🚀 ОСНОВНЫЕ:"
	@echo "  make all      - Полный цикл: сборка → запуск → тест API"
	@echo ""
	@echo "🏗️  СБОРКА И ЗАПУСК:"
	@echo "  make build    - Собрать проект"
	@echo "  make up       - Запустить сервисы"
	@echo "  make down     - Остановить сервисы"
	@echo "  make restart  - Перезапустить"
	@echo ""
	@echo "🧪 ТЕСТИРОВАНИЕ:"
	@echo "  make test-api   - Проверка API"
	@echo "  make test-read  - Тест чтения (k6)"
	@echo "  make test-write - Тест записи (k6)"
	@echo "  make test-full  - Полный тест (k6)"
	@echo ""
	@echo "📊 МОНИТОРИНГ:"
	@echo "  make logs     - Логи сервиса"
	@echo "  make status   - Статус сервисов"
	@echo "  make db-shell - Подключиться к БД"
	@echo ""
	@echo "🧹 ОЧИСТКА:"
	@echo "  make clean    - Полная очистка"
	@echo "===================================================================="

# Полный цикл
all: build up test-api
	@echo "✅ Все необходимые компоненты установлены"

# Сборка
build:
	@echo "🏗️  Сборка проекта..."
	@if [ -f "$(MAVEN)" ]; then \
		$(MAVEN) clean package -DskipTests; \
	fi
	@$(DOCKER_COMPOSE) build --no-cache
	@echo "✅ Сборка завершена"

# Запуск
up:
	@echo "🚀 Запуск сервисов..."
	@$(DOCKER_COMPOSE) up -d
	@sleep 10
	@curl -s -f http://localhost:8080/actuator/health >/dev/null 2>&1 && \
		echo "✅ Сервис доступен" || \
		echo "⚠️  Сервис запущен, но проверка не удалась"

# Остановка
down:
	@echo "🛑 Остановка сервисов..."
	@$(DOCKER_COMPOSE) down -v

# Перезапуск
restart: down up

# Логи
logs:
	@$(DOCKER_COMPOSE) logs -f payment-service

# Статус
status:
	@$(DOCKER_COMPOSE) ps
	@echo ""
	@curl -s http://localhost:8080/actuator/health 2>/dev/null | \
		grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 | \
		xargs echo "Статус здоровья:" || echo "Сервис не отвечает"

# Тест API
test-api:
	@echo "🧪 Тестирование API..."
	@echo "1. POST /api/payments/fetch-and-save:"
	@curl -X POST http://localhost:8080/api/payments/fetch-and-save -s -w "\n   Статус: %{http_code} | Время: %{time_total}с\n"
	@echo ""
	@echo "2. GET /api/payments?limit=3:"
	@curl -s http://localhost:8080/api/payments?limit=3 | grep -o '"id"' | wc -l | xargs echo "   Получено платежей:"

# Тесты k6
test-read:
	@if command -v k6 >/dev/null 2>&1; then \
		k6 run $(SCRIPTS_DIR)/read-test.js; \
	else \
		echo "❌ k6 не установлен. Установите: brew install k6"; \
	fi

test-write:
	@if command -v k6 >/dev/null 2>&1; then \
		k6 run $(SCRIPTS_DIR)/write-test.js; \
	else \
		echo "❌ k6 не установлен. Установите: brew install k6"; \
	fi

test-full:
	@if command -v k6 >/dev/null 2>&1; then \
		k6 run $(SCRIPTS_DIR)/full-test.js; \
	else \
		echo "❌ k6 не установлен. Установите: brew install k6"; \
	fi

# Подключение к БД
db-shell:
	@$(DOCKER_COMPOSE) exec postgres psql -U payment_user -d payment_db

# Очистка
clean:
	@$(DOCKER_COMPOSE) down -v --rmi all 2>/dev/null || true
	@if [ -f "$(MAVEN)" ]; then \
		$(MAVEN) clean; \
	fi
	@echo "✅ Очистка завершена"
