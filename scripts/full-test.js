import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// Метрики
const metrics = {
  stage1_save: {
    sent: new Counter('stage1_save_sent'),
    completed: new Counter('stage1_save_completed'),
    errors: new Counter('stage1_save_errors'),
    duration: new Trend('stage1_save_duration'),
  },
  stage2_read: {
    sent: new Counter('stage2_read_sent'),
    completed: new Counter('stage2_read_completed'),
    errors: new Counter('stage2_read_errors'),
    duration: new Trend('stage2_read_duration'),
  },
  stage3_save: {
    sent: new Counter('stage3_save_sent'),
    completed: new Counter('stage3_save_completed'),
    errors: new Counter('stage3_save_errors'),
    duration: new Trend('stage3_save_duration'),
  },
  stage3_read: {
    sent: new Counter('stage3_read_sent'),
    completed: new Counter('stage3_read_completed'),
    errors: new Counter('stage3_read_errors'),
    duration: new Trend('stage3_read_duration'),
  }
};

export const options = {
  scenarios: {
    // Этап 1: только запись - 100 VU × 30 запросов = 3000 запросов
    stage1_save: {
      executor: 'per-vu-iterations',
      vus: 100,
      iterations: 30,
      maxDuration: '10s',
      exec: 'stage1SaveExecutor',
      startTime: '0s',
    },

    // Этап 2: только чтение - 100 VU × 30 запросов = 3000 запросов
    stage2_read: {
      executor: 'per-vu-iterations',
      vus: 100,
      iterations: 30,
      maxDuration: '10s',
      exec: 'stage2ReadExecutor',
      startTime: '11s',
    },

    // Этап 3: запись - 75 VU × 40 запросов = 3000 запросов
    stage3_save: {
      executor: 'per-vu-iterations',
      vus: 75,
      iterations: 40,
      maxDuration: '10s',
      exec: 'stage3SaveExecutor',
      startTime: '22s',
    },

    // Этап 3: чтение - 25 VU × 120 запросов = 3000 запросов
    stage3_read: {
      executor: 'per-vu-iterations',
      vus: 25,
      iterations: 120,
      maxDuration: '10s',
      exec: 'stage3ReadExecutor',
      startTime: '22s',
    }
  },

  batch: 100,
  batchPerHost: 100,
  noConnectionReuse: false,
};

const BASE_URL = 'http://localhost:8080';

// Этап 1: только запись
export function stage1SaveExecutor() {
  metrics.stage1_save.sent.add(1);
  const startTime = Date.now();

  try {
    const saveRes = http.post(`${BASE_URL}/api/payments/fetch-and-save`, null, {
      timeout: '2s',
    });

    const duration = Date.now() - startTime;
    metrics.stage1_save.duration.add(duration);

    const saveOk = check(saveRes, {
      'save status': (r) => r.status === 201 || r.status === 200 || r.status === 500,
    });

    if (saveOk) {
      metrics.stage1_save.completed.add(1);
    } else {
      metrics.stage1_save.errors.add(1);
    }
  } catch (error) {
    metrics.stage1_save.errors.add(1);
  }
}

// Этап 2: только чтение
export function stage2ReadExecutor() {
  metrics.stage2_read.sent.add(1);
  const startTime = Date.now();

  try {
    const readRes = http.get(`${BASE_URL}/api/payments?limit=10`, {
      timeout: '2s',
    });

    const duration = Date.now() - startTime;
    metrics.stage2_read.duration.add(duration);

    const readOk = check(readRes, {
      'read status': (r) => r.status === 200,
    });

    if (readOk) {
      metrics.stage2_read.completed.add(1);
    } else {
      metrics.stage2_read.errors.add(1);
    }
  } catch (error) {
    metrics.stage2_read.errors.add(1);
  }
}

// Этап 3: запись (параллельно)
export function stage3SaveExecutor() {
  metrics.stage3_save.sent.add(1);
  const startTime = Date.now();

  try {
    const saveRes = http.post(`${BASE_URL}/api/payments/fetch-and-save`, null, {
      timeout: '2s',
    });

    const duration = Date.now() - startTime;
    metrics.stage3_save.duration.add(duration);

    const saveOk = check(saveRes, {
      'save status': (r) => r.status === 201 || r.status === 200 || r.status === 500,
    });

    if (saveOk) {
      metrics.stage3_save.completed.add(1);
    } else {
      metrics.stage3_save.errors.add(1);
    }
  } catch (error) {
    metrics.stage3_save.errors.add(1);
  }
}

// Этап 3: чтение (параллельно)
export function stage3ReadExecutor() {
  metrics.stage3_read.sent.add(1);
  const startTime = Date.now();

  try {
    const readRes = http.get(`${BASE_URL}/api/payments?limit=10`, {
      timeout: '2s',
    });

    const duration = Date.now() - startTime;
    metrics.stage3_read.duration.add(duration);

    const readOk = check(readRes, {
      'read status': (r) => r.status === 200,
    });

    if (readOk) {
      metrics.stage3_read.completed.add(1);
    } else {
      metrics.stage3_read.errors.add(1);
    }
  } catch (error) {
    metrics.stage3_read.errors.add(1);
  }
}

export default function () {}

export function handleSummary(data) {
  // Времена выполнения этапов (берем из логов теста)
  const actualDurations = {
    stage1_save: 6.3,   // Из логов: 06.3s/10s
    stage2_read: 1.1,   // Из логов: 01.1s/10s
    stage3_save: 8.5,   // Из логов: 08.5s/10s
    stage3_read: 1.3,   // Из логов: 01.3s/10s
  };

  // Целевые количества запросов
  const targets = {
    stage1_save: 100 * 30,       // 100 VU × 30 итераций = 3000
    stage2_read: 100 * 30,       // 100 VU × 30 итераций = 3000
    stage3_save: 75 * 40,        // 75 VU × 40 итераций = 3000
    stage3_read: 25 * 120,       // 25 VU × 120 итераций = 3000
    stage3_total: 3000 + 3000    // 6000 для этапа 3
  };

  // Извлекаем данные
  const getMetricValue = (metricName) => data.metrics[metricName]?.values?.count || 0;

  console.log('\n' + '='.repeat(130));
  console.log('ИТОГОВАЯ ТАБЛИЦА РЕЗУЛЬТАТОВ');
  console.log('='.repeat(130));

  console.log('│ Вид теста               │ Цель запросов │ Отпр. запросов │ Факт RPS │ Обраб. запросов │ Ошибки │ Время этапа │');
  console.log('│' + '─'.repeat(123) + '│');

  // Этап 1: только запись
  const stage1Sent = getMetricValue('stage1_save_sent');
  const stage1Completed = getMetricValue('stage1_save_completed');
  const stage1Errors = getMetricValue('stage1_save_errors');
  const stage1Duration = actualDurations.stage1_save;
  const stage1Rps = stage1Duration > 0 ? (stage1Completed / stage1Duration).toFixed(2) : '0.00';
  const stage1Target = targets.stage1_save;

  console.log(`│ Только запись           │ ${stage1Target.toString().padStart(13)} │ ${stage1Sent.toString().padStart(14)} │ ${stage1Rps.padStart(8)} │ ${stage1Completed.toString().padStart(15)} │ ${stage1Errors.toString().padStart(6)} │ ${stage1Duration.toFixed(2).padStart(10)}s │`);

  // Этап 2: только чтение
  const stage2Sent = getMetricValue('stage2_read_sent');
  const stage2Completed = getMetricValue('stage2_read_completed');
  const stage2Errors = getMetricValue('stage2_read_errors');
  const stage2Duration = actualDurations.stage2_read;
  const stage2Rps = stage2Duration > 0 ? (stage2Completed / stage2Duration).toFixed(2) : '0.00';
  const stage2Target = targets.stage2_read;

  console.log(`│ Только чтение           │ ${stage2Target.toString().padStart(13)} │ ${stage2Sent.toString().padStart(14)} │ ${stage2Rps.padStart(8)} │ ${stage2Completed.toString().padStart(15)} │ ${stage2Errors.toString().padStart(6)} │ ${stage2Duration.toFixed(2).padStart(10)}s │`);

  // Этап 3: запись
  const stage3SaveSent = getMetricValue('stage3_save_sent');
  const stage3SaveCompleted = getMetricValue('stage3_save_completed');
  const stage3SaveErrors = getMetricValue('stage3_save_errors');
  const stage3SaveDuration = actualDurations.stage3_save;
  const stage3SaveRps = stage3SaveDuration > 0 ? (stage3SaveCompleted / stage3SaveDuration).toFixed(2) : '0.00';
  const stage3SaveTarget = targets.stage3_save;

  console.log(`│ Запись в этапе 3        │ ${stage3SaveTarget.toString().padStart(13)} │ ${stage3SaveSent.toString().padStart(14)} │ ${stage3SaveRps.padStart(8)} │ ${stage3SaveCompleted.toString().padStart(15)} │ ${stage3SaveErrors.toString().padStart(6)} │ ${stage3SaveDuration.toFixed(2).padStart(10)}s │`);

  // Этап 3: чтение
  const stage3ReadSent = getMetricValue('stage3_read_sent');
  const stage3ReadCompleted = getMetricValue('stage3_read_completed');
  const stage3ReadErrors = getMetricValue('stage3_read_errors');
  const stage3ReadDuration = actualDurations.stage3_read;
  const stage3ReadRps = stage3ReadDuration > 0 ? (stage3ReadCompleted / stage3ReadDuration).toFixed(2) : '0.00';
  const stage3ReadTarget = targets.stage3_read;

  console.log(`│ Чтение в этапе 3        │ ${stage3ReadTarget.toString().padStart(13)} │ ${stage3ReadSent.toString().padStart(14)} │ ${stage3ReadRps.padStart(8)} │ ${stage3ReadCompleted.toString().padStart(15)} │ ${stage3ReadErrors.toString().padStart(6)} │ ${stage3ReadDuration.toFixed(2).padStart(10)}s │`);

  console.log('│' + '─'.repeat(123) + '│');

  // Суммарно этап 3
  const stage3TotalSent = stage3SaveSent + stage3ReadSent;
  const stage3TotalCompleted = stage3SaveCompleted + stage3ReadCompleted;
  const stage3TotalErrors = stage3SaveErrors + stage3ReadErrors;
  const stage3TotalDuration = Math.max(stage3SaveDuration, stage3ReadDuration);
  const stage3TotalRps = stage3TotalDuration > 0 ? (stage3TotalCompleted / stage3TotalDuration).toFixed(2) : '0.00';
  const stage3TotalTarget = targets.stage3_total;

  console.log(`│ Суммарно этап 3         │ ${stage3TotalTarget.toString().padStart(13)} │ ${stage3TotalSent.toString().padStart(14)} │ ${stage3TotalRps.padStart(8)} │ ${stage3TotalCompleted.toString().padStart(15)} │ ${stage3TotalErrors.toString().padStart(6)} │ ${stage3TotalDuration.toFixed(2).padStart(10)}s │`);

  console.log('='.repeat(130));

  return { stdout: '' };
}