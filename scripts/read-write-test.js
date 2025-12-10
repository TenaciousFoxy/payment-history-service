import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

// Метрики
const sentCounter = new Counter('requests_sent');
const completedCounter = new Counter('requests_completed');
const failedCounter = new Counter('requests_failed');

// Время теста
let testStartTime = 0;
let testEndTime = 0;

export const options = {
  scenarios: {
    write_load: {
      executor: 'ramping-arrival-rate', // Изменяем тип executor
      startRate: 200,                    // Начинаем с 200 RPS
      timeUnit: '1s',                    // запросов в секунду
      stages: [
        { target: 200, duration: '10s' }, // Держим 200 RPS 10 секунд
      ],
      preAllocatedVUs: 500,              // Очень много VU
      maxVUs: 1000,                      // Максимум VU
      exec: 'writeExecutor',
    }
  },
  discardResponseBodies: true,
  // Системные настройки для агрессивной отправки
  noConnectionReuse: true,
  batch: 200,
  batchPerHost: 200,
};

const BASE_URL = 'http://localhost:8080';

export function setup() {
  testStartTime = Date.now();
}

export function writeExecutor() {
  // Первый запрос в тесте
  if (testStartTime === 0) {
    testStartTime = Date.now();
  }

  sentCounter.add(1);

  const writeRes = http.post(`${BASE_URL}/api/payments/fetch-and-save`, null, {
    timeout: '2s',
  });

  const writeOk = check(writeRes, {
    'write status': (r) => r.status === 200 || r.status === 201,
  });

  if (writeOk) {
    completedCounter.add(1);
  } else {
    failedCounter.add(1);
  }

  // Обновляем время окончания
  testEndTime = Date.now();
}

export default function () {}

export function teardown() {
  if (testEndTime === 0) {
    testEndTime = Date.now();
  }
}

export function handleSummary(data) {
  const sent = data.metrics.requests_sent?.values?.count || 0;
  const completed = data.metrics.requests_completed?.values?.count || 0;
  const failed = data.metrics.requests_failed?.values?.count || 0;

  // Фактическое время теста (10 секунд из stages)
  const testDurationSeconds = 10;

  // Целевое количество запросов
  const targetRequests = 2000; // 200 RPS × 10 секунд

  // Фактический RPS отправки
  const sentRps = (sent / testDurationSeconds).toFixed(2);

  // Фактический RPS обработки сервером
  const serverRps = (completed / testDurationSeconds).toFixed(2);

  // Процент успеха
  const successPercent = sent > 0 ? ((completed / sent) * 100).toFixed(1) : '0.0';

  console.log('\n' + '='.repeat(120));
  console.log('РЕЗУЛЬТАТЫ АГРЕССИВНОГО ТЕСТА: ЗАПИСЬ');
  console.log('='.repeat(120));
  console.log('ПАРАМЕТРЫ: Агрессивная отправка 200 RPS в течение 10 секунд');
  console.log('='.repeat(120));
  console.log('│ Тест     │ Цель RPS │ Отпр. │ Обраб. │ Ошибки │ Успех % │ RPS отправки │ RPS сервера │ Время теста │');
  console.log('│' + '─'.repeat(118) + '│');
  console.log(`│ Запись   │       200 │ ${sent.toString().padStart(5)} │ ${completed.toString().padStart(6)} │ ${failed.toString().padStart(6)} │ ${successPercent.padStart(6)}% │ ${sentRps.padStart(11)} │ ${serverRps.padStart(10)} │ ${testDurationSeconds.toFixed(1).padStart(10)}s │`);
  console.log('='.repeat(120));

  // Анализ результатов
  console.log('\n📊 АНАЛИЗ РЕЗУЛЬТАТОВ:');
  console.log(`1. Отправлено запросов: ${sent} из ${targetRequests} (${((sent/targetRequests)*100).toFixed(1)}%)`);
  console.log(`2. Фактический RPS отправки: ${sentRps}`);
  console.log(`3. Сервер обработал: ${completed} (${successPercent}%)`);
  console.log(`4. RPS сервера: ${serverRps}`);
  console.log(`5. Ошибок: ${failed} (таймауты или 5xx ошибки)`);

  if (sent >= targetRequests * 0.9) {
    console.log('\n✅ ТЕСТ УСПЕШЕН: Удалось отправить ~2000 запросов');
  } else {
    console.log(`\n⚠️  ПРОБЛЕМА: Отправлено только ${sent} из ${targetRequests} запросов`);
    console.log('   Возможные причины:');
    console.log('   - Недостаточно VU (увеличьте preAllocatedVUs)');
    console.log('   - Ограничения системы (увеличьте ulimit)');
    console.log('   - k6 не успевает создавать запросы');
  }

  return { stdout: '' };
}