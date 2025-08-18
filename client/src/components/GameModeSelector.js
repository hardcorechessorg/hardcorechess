import React from 'react';
import { useNavigate } from 'react-router-dom';

const GameModeSelector = () => {
  const navigate = useNavigate();

  const gameModes = [
    {
      id: 'multiplayer',
      title: 'Многопользовательская игра',
      description: 'Играйте с другом по ссылке',
      path: '/multiplayer'
    },
    {
      id: 'computer',
      title: 'Игра против компьютера',
      description: 'Сразитесь с компьютером разной сложности',
      path: '/computer'
    },
    {
      id: 'single',
      title: 'Одиночная игра',
      description: 'Тренируйтесь самостоятельно',
      path: '/single'
    }
  ];

  return (
    <div className="section">
      <p className="kicker">Выберите режим игры</p>
      <div className="grid" style={{ marginTop: 16 }}>
        {gameModes.map((mode) => (
          <div
            key={mode.id}
            className="card"
            onClick={() => navigate(mode.path)}
            style={{ cursor: 'pointer' }}
          >
            <h3 style={{ marginTop: 0 }}>{mode.title}</h3>
            <p style={{ margin: 0 }}>{mode.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameModeSelector;
