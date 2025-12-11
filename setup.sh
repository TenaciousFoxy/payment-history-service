#!/bin/bash
# Установка зависимостей для проекта

set -e

echo "🔧 Установка зависимостей для Payment History Service"
echo "===================================================="

# Функция проверки команды
check_cmd() {
    if command -v $1 &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Проверка Docker
if ! check_cmd "docker"; then
    echo "❌ Docker не установлен"
    echo "Скачайте: https://docs.docker.com/get-docker/"
    exit 1
fi

# Проверка Docker Compose
if ! check_cmd "docker-compose" && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose не установлен"
    echo "Установите: https://docs.docker.com/compose/install/"
    exit 1
fi

# Проверка curl
if ! check_cmd "curl"; then
    echo "❌ curl не установлен"
    exit 1
fi

echo "✅ Все необходимые компоненты установлены"
