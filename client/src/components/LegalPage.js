import React from 'react';

const LegalPage = () => {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2>Публичная оферта и контакты</h2>

      <section style={{ marginTop: 16 }}>
        <h3>Скачать оферту</h3>
        <a
          href="/oferta_027370973970.docx"
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
          <li>Мы уважаем конфиденциальность: храним минимум пользовательских данных.</li>
          <li>Используя сайт, вы соглашаетесь с обработкой технических данных (cookies, IP).</li>
        </ul>
      </section>

      <section style={{ marginTop: 16 }}>
        <h3>Обработка платежей</h3>
        <p>Пожертвования добровольны. Возвраты рассматриваются индивидуально по обращению на e-mail.</p>
      </section>

      <div style={{ marginTop: 24, padding: 12, background: '#f8f9fa', borderRadius: 12 }}>
        <p style={{ margin: 0 }}>Последнее обновление: {new Date().toLocaleDateString()}</p>
      </div>
    </div>
  );
};

export default LegalPage;
