import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

// Метрики
const sentCounter = new Counter('requests_sent');
const completedCounter = new Counter('requests_completed');
const failedCounter = new Counter('requests_failed');

export const options = {
  scenarios: {
    write_load: {
      executor: 'per-vu-iterations', // Самый простой и надежный
      vus: 100,                      // 500 параллельных VU
      iterations: 30,                 // 500 × 4 = 2000 запросов
      maxDuration: '10s',
      exec: 'writeExecutor',
    }
  },
  discardResponseBodies: true,
  // Оптимизации для macOS
  noConnectionReuse: true,
  batch: 100,
  batchPerHost: 100,
};

const BASE_URL = 'http://localhost:8080';

export function writeExecutor() {

    sentCounter.add(1);

    const res = http.post(`${BASE_URL}/api/payments/fetch-and-save`, null, {
      timeout: '2s', // Большой timeout
    });

    const ok = check(res, {
      'status is 2xx': (r) => r.status >= 200 && r.status < 300,
    });

    if (ok) {
      completedCounter.add(1);
    } else {
      failedCounter.add(1);
    }

}

export default function () {}

export function handleSummary(data) {
  const sent = data.metrics.requests_sent?.values?.count || 0;
  const completed = data.metrics.requests_completed?.values?.count || 0;
  const failed = data.metrics.requests_failed?.values?.count || 0;

  const testDurationSeconds = 10; // Ожидаемое время

  const sentRps = (sent / testDurationSeconds).toFixed(2);
  const serverRps = (completed / testDurationSeconds).toFixed(2);
  const successPercent = sent > 0 ? ((completed / sent) * 100).toFixed(1) : '0.0';

  console.log('\n' + '='.repeat(120));
  console.log('РЕЗУЛЬТАТЫ ТЕСТА: ЗАПИСЬ');
  console.log('='.repeat(120));
  console.log('│ Тест     │ Цель RPS │ Отпр. │ Обраб. │ Ошибки │ Успех % │ RPS отправки │ RPS сервера │ Время теста │');
  console.log('│' + '─'.repeat(118) + '│');
  console.log(`│ Запись   │      200 │ ${sent.toString().padStart(5)} │ ${completed.toString().padStart(6)} │ ${failed.toString().padStart(6)} │ ${successPercent.padStart(6)}% │ ${sentRps.padStart(11)} │ ${serverRps.padStart(10)} │ ${testDurationSeconds.toFixed(1).padStart(10)}s │`);
  console.log('='.repeat(120));

  return { stdout: '' };
}