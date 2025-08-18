import React from 'react';

const DONATION_URL = '';

const SupportPage = () => {
  const handleSupport = () => {
    if (DONATION_URL) {
      window.open(DONATION_URL, '_blank', 'noopener,noreferrer');
    } else {
      alert('Ссылка на поддержку будет добавлена позже.');
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
      <h2>Поддержать проект</h2>
      <p>Поддержка проекта очень поможет развитию.</p>

      <button
        onClick={handleSupport}
        style={{
          marginTop: 16,
          padding: '12px 20px',
          background: '#4CAF50',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: '1rem'
        }}
      >
        Поддержать проект
      </button>
      <h2>От 100 рублей</h2>
    </div>
  );
};

export default SupportPage;
