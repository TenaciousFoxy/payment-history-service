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
    read_load: {
      executor: 'constant-arrival-rate',
      rate: 300,
      timeUnit: '1s',
      duration: '10s',
      preAllocatedVUs: 100,
      maxVUs: 100,
      exec: 'readExecutor',
    }
  },
  discardResponseBodies: true,
};

const BASE_URL = 'http://localhost:8080';

export function setup() {
  testStartTime = Date.now();
}

export function readExecutor() {
  // Первый запрос в тесте
  if (testStartTime === 0) {
    testStartTime = Date.now();
  }

  sentCounter.add(1);

  const readRes = http.get(`${BASE_URL}/api/payments?limit=10`, {
    timeout: '100ms',
  });

  const readOk = check(readRes, {
    'read status': (r) => r.status === 200,
  });

  if (readOk) {
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

  // Используем наше измеренное время
  let testDurationSeconds = 0;
  if (testStartTime > 0 && testEndTime > 0) {
    testDurationSeconds = (testEndTime - testStartTime) / 1000;
  }

  // Если все еще 0, используем duration из options
  if (testDurationSeconds <= 0) {
    testDurationSeconds = 10; // duration из options
  }

  // Фактический RPS сервера
  let serverRps = '0.00';
  if (testDurationSeconds > 0) {
    serverRps = (completed / testDurationSeconds).toFixed(2);
  }

  // Целевой RPS теста
  const targetRps = 200;

  // Процент успеха
  const successPercent = sent > 0 ? ((completed / sent) * 100).toFixed(1) : '0.0';

  console.log('\n' + '='.repeat(120));
  console.log('РЕЗУЛЬТАТЫ НАГРУЗОЧНОГО ТЕСТА');
  console.log('='.repeat(120));
  console.log('│ Тест     │ RPS теста │ Отпр. │ Обраб. │ Ошибки │ Успех % │ RPS сервера │ Время теста │');
  console.log('│' + '─'.repeat(118) + '│');
  console.log(`│ Чтение   │       200 │ ${sent.toString().padStart(5)} │ ${completed.toString().padStart(6)} │ ${failed.toString().padStart(6)} │ ${successPercent.padStart(6)}% │ ${serverRps.padStart(10)} │ ${testDurationSeconds.toFixed(1).padStart(10)}s │`);
  console.log('='.repeat(120));


  return { stdout: '' };
}