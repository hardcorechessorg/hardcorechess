import React from 'react';

const SupportPage = () => {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2>Поддержать проект</h2>
      <p>
        Если вам нравится Hardcore Chess и вы хотите поддержать развитие проекта — это очень поможет
        ускорить добавление новых функций (рейтинги, сохранение партий, чат и др.).
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 20 }}>
        <div style={{ padding: 16, borderRadius: 12, border: '1px solid #eee' }}>
          <h3 style={{ marginTop: 0 }}>Быстрый перевод</h3>
          <p>Перевод по номеру телефона:</p>
          <p style={{ fontWeight: 'bold' }}>+7 993 419-40-97</p>
        </div>

        <div style={{ padding: 16, borderRadius: 12, border: '1px solid #eee' }}>
          <h3 style={{ marginTop: 0 }}>ЮMoney / ЮKassa</h3>
          <p>Перевод по e-mail:</p>
          <p style={{ fontWeight: 'bold' }}>chicherov.paramatma@yandex.ru</p>
        </div>

        <div style={{ padding: 16, borderRadius: 12, border: '1px solid #eee' }}>
          <h3 style={{ marginTop: 0 }}>Crypto</h3>
          <p>Напишите на e-mail, отправлю адреса кошельков.</p>
          <p style={{ fontWeight: 'bold' }}>chicherov.paramatma@yandex.ru</p>
        </div>
      </div>

      <div style={{ marginTop: 32, padding: 16, background: '#f8f9fa', borderRadius: 12 }}>
        <p style={{ margin: 0 }}>Спасибо за поддержку! Даже небольшая сумма помогает развивать проект ❤️</p>
      </div>
    </div>
  );
};

export default SupportPage;
