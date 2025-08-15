import React from 'react';

const GameModeSelector = ({ onSelect }) => {
  const gameModes = [
    {
      id: 'multiplayer',
      title: '🎮 Многопользовательская игра',
      description: 'Играйте с другом по ссылке',
      color: '#4CAF50'
    },
    {
      id: 'computer',
      title: '🤖 Игра против компьютера',
      description: 'Сразитесь с Stockfish',
      color: '#2196F3'
    },
    {
      id: 'single',
      title: '🧩 Одиночная игра',
      description: 'Тренируйтесь самостоятельно',
      color: '#FF9800'
    }
  ];

  return (
    <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '40px', color: '#333' }}>
        Выберите режим игры
      </h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginTop: '30px'
      }}>
        {gameModes.map((mode) => (
          <div
            key={mode.id}
            onClick={() => onSelect(mode.id)}
            style={{
              padding: '30px',
              borderRadius: '15px',
              backgroundColor: mode.color,
              color: 'white',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              border: 'none',
              textAlign: 'center'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-5px)';
              e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            }}
          >
            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.5em' }}>
              {mode.title}
            </h3>
            <p style={{ margin: '0', opacity: '0.9', fontSize: '1.1em' }}>
              {mode.description}
            </p>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '40px', color: '#666', fontSize: '0.9em' }}>
        <p>♟ Разработано с любовью к шахматам</p>
      </div>
    </div>
  );
};

export default GameModeSelector;
