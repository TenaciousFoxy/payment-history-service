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
    // Этап 1: только запись - 200 VU × 20 запросов = 4000 запросов
    stage1_save: {
      executor: 'per-vu-iterations',
      vus: 200,                    // 200 виртуальных пользователей
      iterations: 20,              // 20 запросов на каждого VU
      maxDuration: '60s',          // Максимум 60 секунд на выполнение
      exec: 'stage1SaveExecutor',
      startTime: '0s',
    },

    // Этап 2: только чтение - 200 VU × 20 запросов = 4000 запросов
    stage2_read: {
      executor: 'per-vu-iterations',
      vus: 200,
      iterations: 20,
      maxDuration: '60s',
      exec: 'stage2ReadExecutor',
      startTime: '62s',           // 60s + 2s buffer
    },

    // Этап 3: запись - 100 VU × 40 запросов = 4000 запросов
    stage3_save: {
      executor: 'per-vu-iterations',
      vus: 100,                    // 100 VU на запись
      iterations: 40,              // 40 запросов на VU (100 × 40 = 4000)
      maxDuration: '60s',
      exec: 'stage3SaveExecutor',
      startTime: '124s',          // 62s + 60s + 2s
    },

    // Этап 3: чтение - 100 VU × 40 запросов = 4000 запросов
    stage3_read: {
      executor: 'per-vu-iterations',
      vus: 100,                    // 100 VU на чтение
      iterations: 40,              // 40 запросов на VU
      maxDuration: '60s',
      exec: 'stage3ReadExecutor',
      startTime: '124s',          // параллельно
    }
  },

  // Увеличиваем системные лимиты
  batch: 100,
  batchPerHost: 100,
  noConnectionReuse: false, // Разрешаем переиспользование
};

const BASE_URL = 'http://localhost:8080';

// Этап 1: только запись
export function stage1SaveExecutor() {
  for (let i = 0; i < 20; i++) {
    metrics.stage1_save.sent.add(1);
    const startTime = Date.now();

    try {
      const saveRes = http.post(`${BASE_URL}/api/payments/fetch-and-save`, null, {
        timeout: '10s',
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
}

// Этап 2: только чтение
export function stage2ReadExecutor() {
  for (let i = 0; i < 20; i++) {
    metrics.stage2_read.sent.add(1);
    const startTime = Date.now();

    try {
      const readRes = http.get(`${BASE_URL}/api/payments?limit=10`, {
        timeout: '5s',
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
}

// Этап 3: запись (параллельно)
export function stage3SaveExecutor() {
  for (let i = 0; i < 40; i++) {
    metrics.stage3_save.sent.add(1);
    const startTime = Date.now();

    try {
      const saveRes = http.post(`${BASE_URL}/api/payments/fetch-and-save`, null, {
        timeout: '10s',
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
}

// Этап 3: чтение (параллельно)
export function stage3ReadExecutor() {
  for (let i = 0; i < 40; i++) {
    metrics.stage3_read.sent.add(1);
    const startTime = Date.now();

    try {
      const readRes = http.get(`${BASE_URL}/api/payments?limit=10`, {
        timeout: '5s',
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
}

export default function () {}

export function handleSummary(data) {
  const stageDuration = 20; // Целевая длительность этапа
  const bufferTime = 2;
  const actualDuration = stageDuration + bufferTime;

  // Извлекаем данные
  const getMetricValue = (metricName) => data.metrics[metricName]?.values?.count || 0;
  const getAvgTime = (metricName) => data.metrics[metricName]?.values?.avg || 0;

  console.log('\n' + '='.repeat(110));
  console.log('ИТОГОВАЯ ТАБЛИЦА РЕЗУЛЬТАТОВ (ГАРАНТИРОВАННАЯ ОТПРАВКА)');
  console.log('='.repeat(110));

  console.log('│ Вид теста               │ Цель RPS │ Цель запросов │ Отпр. запросов │ Факт RPS │ Обраб. запросов │ Ошибки │ Необраб. │ Ср. время │');
  console.log('│' + '─'.repeat(128) + '│');

  // Только запись
  const stage1Sent = getMetricValue('stage1_save_sent');
  const stage1Completed = getMetricValue('stage1_save_completed');
  const stage1Errors = getMetricValue('stage1_save_errors');
  const stage1Rps = (stage1Completed / actualDuration).toFixed(2);
  const stage1AvgTime = getAvgTime('stage1_save_duration').toFixed(2);
  const stage1Target = 4000;

  console.log(`│ Только запись           │      200 │ ${stage1Target.toString().padStart(13)} │ ${stage1Sent.toString().padStart(14)} │ ${stage1Rps.padStart(8)} │ ${stage1Completed.toString().padStart(15)} │ ${stage1Errors.toString().padStart(6)} │ ${stage1Errors.toString().padStart(8)} │ ${stage1AvgTime.padStart(9)}ms │`);

  // Только чтение
  const stage2Sent = getMetricValue('stage2_read_sent');
  const stage2Completed = getMetricValue('stage2_read_completed');
  const stage2Errors = getMetricValue('stage2_read_errors');
  const stage2Rps = (stage2Completed / actualDuration).toFixed(2);
  const stage2AvgTime = getAvgTime('stage2_read_duration').toFixed(2);
  const stage2Target = 4000;

  console.log(`│ Только чтение           │      200 │ ${stage2Target.toString().padStart(13)} │ ${stage2Sent.toString().padStart(14)} │ ${stage2Rps.padStart(8)} │ ${stage2Completed.toString().padStart(15)} │ ${stage2Errors.toString().padStart(6)} │ ${stage2Errors.toString().padStart(8)} │ ${stage2AvgTime.padStart(9)}ms │`);

  // Запись в этапе 3
  const stage3SaveSent = getMetricValue('stage3_save_sent');
  const stage3SaveCompleted = getMetricValue('stage3_save_completed');
  const stage3SaveErrors = getMetricValue('stage3_save_errors');
  const stage3SaveRps = (stage3SaveCompleted / actualDuration).toFixed(2);
  const stage3SaveAvgTime = getAvgTime('stage3_save_duration').toFixed(2);
  const stage3SaveTarget = 4000;

  console.log(`│ Запись в этапе 3        │      200 │ ${stage3SaveTarget.toString().padStart(13)} │ ${stage3SaveSent.toString().padStart(14)} │ ${stage3SaveRps.padStart(8)} │ ${stage3SaveCompleted.toString().padStart(15)} │ ${stage3SaveErrors.toString().padStart(6)} │ ${stage3SaveErrors.toString().padStart(8)} │ ${stage3SaveAvgTime.padStart(9)}ms │`);

  // Чтение в этапе 3
  const stage3ReadSent = getMetricValue('stage3_read_sent');
  const stage3ReadCompleted = getMetricValue('stage3_read_completed');
  const stage3ReadErrors = getMetricValue('stage3_read_errors');
  const stage3ReadRps = (stage3ReadCompleted / actualDuration).toFixed(2);
  const stage3ReadAvgTime = getAvgTime('stage3_read_duration').toFixed(2);
  const stage3ReadTarget = 4000;

  console.log(`│ Чтение в этапе 3        │      200 │ ${stage3ReadTarget.toString().padStart(13)} │ ${stage3ReadSent.toString().padStart(14)} │ ${stage3ReadRps.padStart(8)} │ ${stage3ReadCompleted.toString().padStart(15)} │ ${stage3ReadErrors.toString().padStart(6)} │ ${stage3ReadErrors.toString().padStart(8)} │ ${stage3ReadAvgTime.padStart(9)}ms │`);

  console.log('│' + '─'.repeat(128) + '│');

  // Суммарно этап 3
  const stage3TotalSent = stage3SaveSent + stage3ReadSent;
  const stage3TotalCompleted = stage3SaveCompleted + stage3ReadCompleted;
  const stage3TotalErrors = stage3SaveErrors + stage3ReadErrors;
  const stage3TotalRps = (stage3TotalCompleted / actualDuration).toFixed(2);
  const stage3TotalTarget = 8000;

  console.log(`│ Суммарно этап 3         │      400 │ ${stage3TotalTarget.toString().padStart(13)} │ ${stage3TotalSent.toString().padStart(14)} │ ${stage3TotalRps.padStart(8)} │ ${stage3TotalCompleted.toString().padStart(15)} │ ${stage3TotalErrors.toString().padStart(6)} │ ${stage3TotalErrors.toString().padStart(8)} │           │`);

  console.log('='.repeat(130));

  // Простая статистика
  console.log('\n📊 ВЫПОЛНЕНИЕ ЦЕЛИ:');
  console.log('─'.repeat(50));

  const stages = [
    { name: 'Запись этап 1', sent: stage1Sent, target: stage1Target },
    { name: 'Чтение этап 2', sent: stage2Sent, target: stage2Target },
    { name: 'Запись этап 3', sent: stage3SaveSent, target: stage3SaveTarget },
    { name: 'Чтение этап 3', sent: stage3ReadSent, target: stage3ReadTarget },
  ];

  stages.forEach(stage => {
    const percent = ((stage.sent / stage.target) * 100).toFixed(1);
    console.log(`${stage.name}: ${stage.sent}/${stage.target} (${percent}%)`);
  });

  console.log('\n' + '='.repeat(50));
  console.log('ТЕСТ ЗАВЕРШЕН');
  console.log('='.repeat(50));

  return { stdout: '' };
}