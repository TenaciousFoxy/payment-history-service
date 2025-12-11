import React, { useState, useEffect } from 'react';

function App() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCount, setShowCount] = useState('');
  const [createdPayments, setCreatedPayments] = useState([]); // Новое состояние
  const [showMode, setShowMode] = useState('all'); // 'all', 'created', 'latest'
  const API_URL = 'http://localhost:8080/api';

  // Загрузка всех платежей (при старте)
  const loadAllPayments = async () => {
    try {
      const response = await fetch(`${API_URL}/payments/all`);
      const data = await response.json();
      setPayments(data);
      setShowMode('all');
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    }
  };

  // Загрузка N платежей
  const loadPaymentsWithLimit = async (limit) => {
    try {
      const response = await fetch(`${API_URL}/payments?limit=${limit}`);
      const data = await response.json();
      setPayments(data);
      setShowMode('latest');
    } catch (error) {
      console.error('Ошибка загрузки:', error);
    }
  };

  // Создание платежа
  const createPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/payments/fetch-and-save`, {
        method: 'POST'
      });

      if (response.ok) {
        const newPayment = await response.json();

        // Добавляем созданный платеж в список созданных
        setCreatedPayments(prev => [newPayment, ...prev]);

        // Показываем только созданные платежи
        setPayments([newPayment, ...createdPayments]);
        setShowMode('created');
      }
    } catch (error) {
      console.error('Ошибка создания:', error);
    } finally {
      setLoading(false);
    }
  };

  // Показать только созданные платежи
  const showCreatedPayments = () => {
    if (createdPayments.length > 0) {
      setPayments(createdPayments);
      setShowMode('created');
    } else {
      alert('Вы еще не создали ни одного платежа');
    }
  };

  // Очистка всех платежей
  const clearPayments = () => {
    setPayments([]);
    setCreatedPayments([]);
  };

  // Очистка только созданных платежей
  const clearCreatedPayments = () => {
    setCreatedPayments([]);
    if (showMode === 'created') {
      setPayments([]);
    }
  };

  const handleShowCount = () => {
    const count = parseInt(showCount);
    if (count > 0) {
      loadPaymentsWithLimit(count);
    }
  };

  // При старте загружаем 10 последних платежей
  useEffect(() => {
    loadPaymentsWithLimit(10);
  }, []);

  // Определяем заголовок в зависимости от режима
  const getTableTitle = () => {
    switch(showMode) {
      case 'created':
        return `Созданные платежи (${payments.length})`;
      case 'latest':
        return `Последние платежи (${payments.length})`;
      case 'all':
        return `Все платежи (${payments.length})`;
      default:
        return `Платежи (${payments.length})`;
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Payment Dashboard</h1>

      {/* Панель управления */}
      <div style={{
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
        marginBottom: '20px',
        padding: '15px',
        background: '#f5f5f5',
        borderRadius: '8px'
      }}>
        {/* Создание платежа */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <button
            onClick={createPayment}
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Создание...' : 'Создать платеж'}
          </button>
          <small style={{ color: '#666', textAlign: 'center' }}>
            Созданных: {createdPayments.length}
          </small>
        </div>

        {/* Кнопки отображения */}
        <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
          <button
            onClick={showCreatedPayments}
            disabled={createdPayments.length === 0}
            style={{
              padding: '10px 20px',
              background: createdPayments.length === 0 ? '#ccc' :
                         showMode === 'created' ? '#0056b3' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: createdPayments.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: showMode === 'created' ? 'bold' : 'normal'
            }}
          >
            Показать созданные ({createdPayments.length})
          </button>
          <small style={{ color: '#666', textAlign: 'center' }}>
            Только ваши
          </small>
        </div>

        {/* Очистка */}
        <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
          <button
            onClick={clearCreatedPayments}
            disabled={createdPayments.length === 0}
            style={{
              padding: '10px 20px',
              background: createdPayments.length === 0 ? '#ccc' : '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: createdPayments.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            Очистить созданные
          </button>
          <small style={{ color: '#666', textAlign: 'center' }}>
            Только ваши
          </small>
        </div>

        {/* Показать все */}
        <button
          onClick={loadAllPayments}
          style={{
            padding: '10px 20px',
            background: showMode === 'all' ? '#0056b3' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: showMode === 'all' ? 'bold' : 'normal'
          }}
        >
          Показать все
        </button>

        {/* Показать N */}
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <input
            type="number"
            value={showCount}
            onChange={(e) => setShowCount(e.target.value)}
            placeholder="Количество"
            min="1"
            style={{
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              width: '100px'
            }}
          />
          <button
            onClick={handleShowCount}
            disabled={!showCount}
            style={{
              padding: '10px 20px',
              background: !showCount ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: !showCount ? 'not-allowed' : 'pointer'
            }}
          >
            Показать
          </button>
        </div>

        {/* Показать 10 */}
        <button
          onClick={() => loadPaymentsWithLimit(10)}
          style={{
            padding: '10px 20px',
            background: showMode === 'latest' ? '#0056b3' : '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: showMode === 'latest' ? 'bold' : 'normal'
          }}
        >
          Показать 10
        </button>

        {/* Очистить все */}
        <button
          onClick={clearPayments}
          style={{
            padding: '10px 20px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Очистить всё
        </button>
      </div>

      {/* Информация о режиме */}
      <div style={{
        marginBottom: '15px',
        padding: '10px',
        background: showMode === 'created' ? '#e7f1ff' : '#f8f9fa',
        borderRadius: '6px',
        borderLeft: `4px solid ${showMode === 'created' ? '#007bff' :
                    showMode === 'latest' ? '#17a2b8' : '#28a745'}`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>{getTableTitle()}</strong>
            {showMode === 'created' && createdPayments.length > 0 && (
              <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                Последний создан: {new Date(createdPayments[0]?.createdAt).toLocaleString()}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <span style={{
              padding: '5px 10px',
              background: showMode === 'created' ? '#007bff' :
                         showMode === 'latest' ? '#17a2b8' : '#28a745',
              color: 'white',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 'bold'
            }}>
              {showMode === 'created' ? 'ТОЛЬКО СОЗДАННЫЕ' :
               showMode === 'latest' ? 'ПОСЛЕДНИЕ' : 'ВСЕ ПЛАТЕЖИ'}
            </span>
            {showMode === 'created' && (
              <span style={{
                padding: '5px 10px',
                background: '#28a745',
                color: 'white',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                🔥 ВАШИ
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Прокручиваемая таблица */}
      <div style={{
        maxHeight: '500px',
        overflowY: 'auto',
        border: '1px solid #ddd',
        borderRadius: '4px'
      }}>
        {payments.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#6c757d'
          }}>
            {showMode === 'created' ? (
              <>
                <p>Вы еще не создали ни одного платежа</p>
                <p>Нажмите "Создать платеж" чтобы начать</p>
              </>
            ) : (
              <>
                <p>Нет платежей для отображения</p>
                <p>Нажмите "Создать платеж" или "Показать все"</p>
              </>
            )}
          </div>
        ) : (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '800px'
          }}>
            <thead style={{
              position: 'sticky',
              top: 0,
              background: '#f2f2f2',
              zIndex: 1
            }}>
              <tr>
                <th style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  textAlign: 'left',
                  background: showMode === 'created' ? '#343a40' : '#495057',
                  color: 'white'
                }}>
                  Дата
                </th>
                <th style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  textAlign: 'left',
                  background: showMode === 'created' ? '#343a40' : '#495057',
                  color: 'white'
                }}>
                  Плательщик
                </th>
                <th style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  textAlign: 'left',
                  background: showMode === 'created' ? '#343a40' : '#495057',
                  color: 'white'
                }}>
                  Сумма
                </th>
                <th style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  textAlign: 'left',
                  background: showMode === 'created' ? '#343a40' : '#495057',
                  color: 'white'
                }}>
                  Статус
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment, index) => (
                <tr key={payment.id} style={{
                  borderBottom: '1px solid #eee',
                  background: showMode === 'created' && index === 0 ? '#fff8e1' :
                             showMode === 'created' ? '#fff' : '#fff',
                  ':hover': { background: '#f8f9fa' }
                }}>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    <div>
                      {new Date(payment.createdAt).toLocaleDateString()}
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        {new Date(payment.createdAt).toLocaleTimeString()}
                      </div>
                      {showMode === 'created' && index === 0 && (
                        <div style={{
                          fontSize: '10px',
                          color: '#28a745',
                          fontWeight: 'bold',
                          marginTop: '2px'
                        }}>
                          ⭐ ПОСЛЕДНИЙ СОЗДАННЫЙ
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    <div>
                      <strong>{payment.payerName}</strong>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        {payment.payerEmail}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    <div style={{
                      fontWeight: 'bold',
                      color: payment.status === 'FAILED' ? '#dc3545' : '#28a745'
                    }}>
                      {payment.amount} {payment.currency}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      {payment.description}
                    </div>
                  </td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      background: payment.status === 'COMPLETED' ? '#d4edda' :
                                 payment.status === 'PENDING' ? '#fff3cd' : '#f8d7da',
                      color: payment.status === 'COMPLETED' ? '#155724' :
                            payment.status === 'PENDING' ? '#856404' : '#721c24'
                    }}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Подсказка */}
      <div style={{
        marginTop: '10px',
        fontSize: '12px',
        color: '#6c757d',
        textAlign: 'center'
      }}>
        {showMode === 'created' && createdPayments.length > 0 && (
          <p>Вы создали {createdPayments.length} платежей. Последний создан {new Date(createdPayments[0]?.createdAt).toLocaleString()}</p>
        )}
        {payments.length > 5 && (
          <p>Используйте колесико мыши или полосу прокрутки справа для просмотра всех записей</p>
        )}
      </div>
    </div>
  );
}

export default App;