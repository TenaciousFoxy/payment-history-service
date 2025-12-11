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

# Проверка Node.js для фронтенда (только для локальной разработки)
echo ""
echo "📦 Проверка фронтенд зависимостей:"
if ! check_cmd "node"; then
    echo "⚠️  Node.js не установлен"
    echo "   Фронтенд будет работать только в Docker контейнере"
    echo "   Для локальной разработки установите Node.js:"
    echo "     macOS: brew install node"
    echo "     Ubuntu: sudo apt install nodejs npm"
    echo "     Или: https://nodejs.org/"
    HAS_NODE=false
else
    echo "✅ Node.js: $(node --version)"
    HAS_NODE=true
fi

if $HAS_NODE; then
    if ! check_cmd "npm"; then
        echo "⚠️  npm не установлен"
    else
        echo "✅ npm: $(npm --version)"
    fi
fi

echo ""
echo "🎯 Дополнительные инструменты (рекомендуется):"
RECOMMENDED_CMDS=("k6" "jq")

for cmd in "${RECOMMENDED_CMDS[@]}"; do
    if check_cmd "$cmd"; then
        echo "✅ $cmd установлен"
    else
        echo "ℹ️  $cmd не установлен (рекомендуется)"
        case $cmd in
            "k6")
                echo "   Для нагрузочного тестирования:"
                echo "     macOS: brew install k6"
                echo "     Linux: https://k6.io/docs/get-started/installation/"
                ;;
            "jq")
                echo "   Для работы с JSON:"
                echo "     macOS: brew install jq"
                echo "     Ubuntu: sudo apt install jq"
                ;;
        esac
    fi
done

echo ""
echo "===================================================="
echo "✅ Все необходимые компоненты установлены"
echo ""
if [ "$HAS_NODE" = false ]; then
    echo "⚠️  Node.js не установлен - фронтенд будет работать только в Docker"
    echo "   Для локальной разработки фронтенда установите Node.js"
fi
echo ""
