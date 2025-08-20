import React from 'react';

const SupportPage = () => {
  const link = 'https://yookassa.ru/my/i/aKWhyhGZ5hUZ/l';

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
      <h2>Поддержать проект</h2>
      <p>Поддержка проекта очень поможет развитию.</p>

      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="button primary"
        style={{ display: 'inline-block', padding: '12px 20px' }}
      >
        Поддержать
      </a>
    </div>
  );
};

export default SupportPage;
