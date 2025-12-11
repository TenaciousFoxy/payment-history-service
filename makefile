.PHONY: help build up down test clean logs db-shell status test-api test-read test-write test-full all frontend-up frontend-logs frontend-down clean-frontend deep-clean restart

# Переменные
DOCKER_COMPOSE = docker-compose
MAVEN = ./mvnw
SCRIPTS_DIR = scripts
FRONTEND_DIR = frontend

# Основные команды
help:
	@echo "===================================================================="
	@echo "Payment History Service - Команды управления"
	@echo "===================================================================="
	@echo ""
	@echo "🚀 ОСНОВНЫЕ КОМАНДЫ:"
	@echo "  make all          - Полный цикл: сборка → запуск → фронтенд → тест API"
	@echo "  make build        - Собрать проект"
	@echo "  make up           - Запустить сервисы (без фронтенда)"
	@echo "  make down         - Остановить сервисы"
	@echo "  make restart      - Перезапустить сервисы"
	@echo ""
	@echo "🎨 ФРОНТЕНД:"
	@echo "  make frontend-up    - Запустить React фронтенд"
	@echo "  make frontend-logs  - Показать логи фронтенда"
	@echo "  make frontend-down  - Остановить фронтенд"
	@echo ""
	@echo "🧪 ТЕСТИРОВАНИЕ:"
	@echo "  make test-api   - Быстрая проверка API"
	@echo "  make test-read  - Тест чтения (k6)"
	@echo "  make test-write - Тест записи (k6)"
	@echo "  make test-full  - Полный тест (k6)"
	@echo ""
	@echo "📊 МОНИТОРИНГ:"
	@echo "  make logs       - Логи бэкенда"
	@echo "  make status     - Статус всех сервисов"
	@echo "  make db-shell   - Подключиться к БД PostgreSQL"
	@echo ""
	@echo "🧹 ОЧИСТКА:"
	@echo "  make clean        - Базовая очистка"
	@echo "  make clean-frontend - Очистка фронтенда"
	@echo "  make deep-clean   - Полная очистка (Docker + фронтенд)"
	@echo ""
	@echo "🌐 ДОСТУП:"
	@echo "  Backend API:  http://localhost:8080"
	@echo "  Frontend:     http://localhost:3000"
	@echo "  Swagger UI:   http://localhost:8080/swagger-ui.html"
	@echo "===================================================================="

# Полный цикл
all: build up frontend-up test-api
	@echo "✅ Все запущено!"
	@echo "   Backend:  http://localhost:8080"
	@echo "   Frontend: http://localhost:3000"

# Фронтенд команды
frontend-up:
	@echo "🚀 Запуск React фронтенда..."
	@$(DOCKER_COMPOSE) up -d frontend
	@echo "✅ Фронтенд запущен на http://localhost:3000"

frontend-logs:
	@echo "📄 Логи фронтенда (Ctrl+C для выхода):"
	@$(DOCKER_COMPOSE) logs -f frontend

frontend-down:
	@echo "🛑 Остановка фронтенда..."
	@$(DOCKER_COMPOSE) stop frontend
	@echo "✅ Фронтенд остановлен"

# Сборка
build:
	@echo "🏗️  Сборка проекта..."
	@if [ -f "$(MAVEN)" ]; then \
		$(MAVEN) clean package -DskipTests; \
	fi
	@$(DOCKER_COMPOSE) build --no-cache
	@echo "✅ Сборка завершена"

# Запуск бэкенда
up:
	@echo "🚀 Запуск бэкенд сервисов..."
	@$(DOCKER_COMPOSE) up -d postgres payment-service
	@echo "Ожидание запуска (10 секунд)..."
	@sleep 10
	@curl -s -f http://localhost:8080/actuator/health >/dev/null 2>&1 && \
		echo "✅ Бэкенд доступен" || \
		echo "⚠️  Бэкенд запущен, но проверка не удалась"

# Остановка
down:
	@echo "🛑 Остановка всех сервисов..."
	@$(DOCKER_COMPOSE) down -v
	@echo "✅ Сервисы остановлены"

# Перезапуск
restart: down up

# Логи бэкенда
logs:
	@echo "📄 Логи бэкенда (Ctrl+C для выхода):"
	@$(DOCKER_COMPOSE) logs -f payment-service

# Статус
status:
	@echo "📊 Статус контейнеров:"
	@$(DOCKER_COMPOSE) ps
	@echo ""
	@echo "🌐 Проверка доступности:"
	@curl -s http://localhost:8080/actuator/health 2>/dev/null | \
		grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4 | \
		xargs echo "  Бэкенд:" || echo "  Бэкенд: ❌ не отвечает"
	@curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | \
		grep -q "^2\|^3" && echo "  Фронтенд: ✅ доступен" || echo "  Фронтенд: ❌ не отвечает"

# Тест API
test-api:
	@echo "🧪 Тестирование API..."
	@echo "1. POST /api/payments/fetch-and-save:"
	@curl -X POST http://localhost:8080/api/payments/fetch-and-save -s -w "\n   Статус: %{http_code} | Время: %{time_total}с\n" || echo "   ❌ Ошибка запроса"
	@echo ""
	@echo "2. GET /api/payments:"
	@response=$$(curl -s http://localhost:8080/api/payments/all 2>/dev/null); \
	if [ -n "$$response" ]; then \
		count=$$(echo "$$response" | grep -o '"id"' | wc -l); \
		echo "   Получено платежей: $$count"; \
	else \
		echo "   ❌ Нет данных"; \
	fi

# Тесты k6
test-read:
	@echo "📖 Запуск теста чтения..."
	@if command -v k6 >/dev/null 2>&1; then \
		k6 run $(SCRIPTS_DIR)/read-test.js; \
	else \
		echo "❌ k6 не установлен. Установите: brew install k6"; \
	fi

test-write:
	@echo "✍️  Запуск теста записи..."
	@if command -v k6 >/dev/null 2>&1; then \
		k6 run $(SCRIPTS_DIR)/write-test.js; \
	else \
		echo "❌ k6 не установлен. Установите: brew install k6"; \
	fi

test-full:
	@echo "🧪 Запуск полного теста..."
	@if command -v k6 >/dev/null 2>&1; then \
		k6 run $(SCRIPTS_DIR)/full-test.js; \
	else \
		echo "❌ k6 не установлен. Установите: brew install k6"; \
	fi

# Подключение к БД
db-shell:
	@echo "🗄️  Подключение к БД PostgreSQL..."
	@$(DOCKER_COMPOSE) exec postgres psql -U payment_user -d payment_db

# Очистка
clean:
	@echo "🧹 Базовая очистка..."
	@$(DOCKER_COMPOSE) down -v 2>/dev/null || true
	@if [ -f "$(MAVEN)" ]; then \
		$(MAVEN) clean; \
	fi
	@echo "✅ Очистка завершена"

clean-frontend:
	@echo "🧹 Очистка фронтенда..."
	@$(DOCKER_COMPOSE) stop frontend 2>/dev/null || true
	@rm -rf $(FRONTEND_DIR)/node_modules $(FRONTEND_DIR)/build 2>/dev/null || true
	@echo "✅ Фронтенд очищен"

deep-clean: clean clean-frontend
	@echo "🧹 Глубокая очистка Docker..."
	@docker-compose down -v --rmi all 2>/dev/null || true
	@docker system prune -a --volumes -f 2>/dev/null || true
	@echo "✅ Глубокая очистка завершена"