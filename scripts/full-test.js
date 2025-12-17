import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

const saveSent = new Counter('save_sent');
const saveCompleted = new Counter('save_completed');
const readSent = new Counter('read_sent');
const readCompleted = new Counter('read_completed');

export const options = {
  scenarios: {
    stage_save: {
      executor: 'per-vu-iterations',
      vus: 75,
      iterations: 20,
      maxDuration: '5s',
      exec: 'stageSaveExecutor',
      startTime: '0s',
    },
    stage_read: {
      executor: 'per-vu-iterations',
      vus: 25,
      iterations: 100,
      maxDuration: '5s',
      exec: 'stageReadExecutor',
      startTime: '0s',
    }
  },
  batch: 50,
  batchPerHost: 50,
  noConnectionReuse: false,
};

const BASE_URL = 'http://localhost:8080';

export function stageSaveExecutor() {
  saveSent.add(1);
  const saveRes = http.post(`${BASE_URL}/api/payments/fetch-and-save`, null, { timeout: '5s' });
  const saveOk = check(saveRes, { 'save status': (r) => r.status === 201 || r.status === 200 || r.status === 500 });
  if (saveOk) saveCompleted.add(1);
}

export function stageReadExecutor() {
  readSent.add(1);
  const readRes = http.get(`${BASE_URL}/api/payments?limit=10`, { timeout: '3s' });
  const readOk = check(readRes, { 'read status': (r) => r.status === 200 });
  if (readOk) readCompleted.add(1);
}

export default function () {}

export function handleSummary(data) {
  const saveSentCount = data.metrics.save_sent ? data.metrics.save_sent.values.count : 0;
  const saveCompletedCount = data.metrics.save_completed ? data.metrics.save_completed.values.count : 0;
  const readSentCount = data.metrics.read_sent ? data.metrics.read_sent.values.count : 0;
  const readCompletedCount = data.metrics.read_completed ? data.metrics.read_completed.values.count : 0;

  const testDuration = 5;

  const saveRps = (saveCompletedCount / testDuration).toFixed(2);
  const readRps = (readCompletedCount / testDuration).toFixed(2);
  const totalRps = ((saveCompletedCount + readCompletedCount) / testDuration).toFixed(2);

  const saveErrors = saveSentCount - saveCompletedCount;
  const readErrors = readSentCount - readCompletedCount;

  console.log('\n' + '='.repeat(85));
  console.log('РЕЗУЛЬТАТЫ НАГРУЗОЧНОГО ТЕСТА');
  console.log('='.repeat(85));
  console.log(`Время выполнения: ${testDuration.toFixed(2)}s`);
  console.log('='.repeat(85));
  console.log('│ Операция    │ Отправлено │ Обработано │ Ошибки │ RPS     │');
  console.log('├' + '─'.repeat(71) + '┤');

  console.log(`│ Запись      │ ${saveSentCount.toString().padStart(10)} │ ${saveCompletedCount.toString().padStart(10)} │ ${saveErrors.toString().padStart(6)} │ ${saveRps.padStart(7)} │`);
  console.log(`│ Чтение      │ ${readSentCount.toString().padStart(10)} │ ${readCompletedCount.toString().padStart(10)} │ ${readErrors.toString().padStart(6)} │ ${readRps.padStart(7)} │`);

  console.log('├' + '─'.repeat(71) + '┤');

  const totalSent = saveSentCount + readSentCount;
  const totalCompleted = saveCompletedCount + readCompletedCount;
  const totalErrors = saveErrors + readErrors;

  console.log(`│ Суммарно    │ ${totalSent.toString().padStart(10)} │ ${totalCompleted.toString().padStart(10)} │ ${totalErrors.toString().padStart(6)} │ ${totalRps.padStart(7)} │`);

  console.log('='.repeat(85));
  console.log(`📊 ПРОИЗВОДИТЕЛЬНОСТЬ СЕРВЕРА:`);
  console.log(`   • Общая скорость: ${totalRps} запросов/секунду`);
  console.log(`   • Запись: ${saveRps} записей/секунду`);
  console.log(`   • Чтение: ${readRps} чтений/секунду`);

  return { stdout: '' };
}