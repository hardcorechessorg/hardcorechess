import React from 'react';

const LegalPage = () => {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2>Публичная оферта и контакты</h2>

      <section style={{ marginTop: 16 }}>
        <h3>Скачать оферту</h3>
        <a
          href="/ПУБЛИЧНАЯ ОФЕРТА.docx"
          target="_blank"
          rel="noopener noreferrer"
          download
          style={{
            display: 'inline-block',
            padding: '10px 16px',
            background: '#2196F3',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none'
          }}
        >
          Скачать оферту (DOCX)
        </a>
      </section>

      <section style={{ marginTop: 24 }}>
        <h3>Реквизиты</h3>
        <p><strong>ИНН:</strong> 027370973970</p>
        <p><strong>Чичеров Платон Артурович</strong></p>
        <p><strong>респ.Татарстан с.Сапуголи ул. Исконная д.13</strong></p>
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>Контакты</h3>
        <p><strong>Телефон:</strong> +7 993 419-40-97</p>
        <p><strong>E-mail:</strong> chicherov.paramatma@yandex.ru</p>
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>Условия использования</h3>
        <ul>
          <li>Сервис предоставляется «как есть», без гарантий бесперебойной работы.</li>
          <li>Мы не храним персональные данные пользователей.</li>
          <li>Используя сайт, вы соглашаетесь с обработкой технических данных (cookies, IP).</li>
          <li>Возвраты по пожертвованиям не предусмотрены.</li>
        </ul>
      </section>

      <div style={{ marginTop: 24, padding: 12, background: '#f8f9fa', borderRadius: 12 }}>
        <p style={{ margin: 0 }}>Последнее обновление: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default LegalPage;
