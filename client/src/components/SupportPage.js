import React, { useState } from 'react';

const SupportPage = () => {
  const [amount, setAmount] = useState('100');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSupport = async () => {
    setError('');
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      setError('Введите корректную сумму');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch('https://hardcorechess.onrender.com/donate/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: num })
      });
      const data = await resp.json();
      if (!resp.ok || !data.confirmationUrl) {
        setError(data?.error || 'Не удалось создать платёж');
        setLoading(false);
        return;
      }
      window.location.href = data.confirmationUrl;
    } catch (e) {
      setError('Ошибка сети');
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
      <h2>Поддержать проект</h2>
      <p>Поддержка проекта очень поможет развитию.</p>

      <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
        <input
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{
            width: 140,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #3a3a3a',
            background: '#2a2a2a',
            color: '#e6e6e6'
          }}
          placeholder="Сумма, ₽"
        />
        <button
          onClick={handleSupport}
          disabled={loading}
          style={{
            padding: '12px 20px',
            background: '#4CAF50',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          {loading ? 'Создание...' : 'Поддержать'}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 12, color: '#ff8a80' }}>{error}</div>
      )}
    </div>
  );
};

export default SupportPage;
