// src/components/BattleUI.tsx
import { Container, Text } from 'phaser-jsx';
import { Depth } from '../constants';

interface Props {
  battleState: string;
  enemyHealth: number;
  enemyMaxHealth: number;
  playerHealth: number;
  playerMaxHealth: number;
  // Убираем обработчики - они теперь в самой сцене
}

export function BattleUI(props: Props) {
  return (
    <Container x={0} y={0}>
      {/* Панель здоровья врага */}
      <Container x={50} y={50}>
        <Text
          x={0}
          y={0}
          text="Враг"
          style={{ font: '24px monospace', color: '#fff' }}
          depth={Depth.AboveWorld}
        />
        <Text
          x={0}
          y={30}
          text={`${Math.max(0, props.enemyHealth)}/${props.enemyMaxHealth}`}
          style={{ font: '18px monospace', color: '#ff5555' }}
          depth={Depth.AboveWorld}
        />
      </Container>
      
      {/* Панель здоровья игрока */}
      <Container x={50} y={400}>
        <Text
          x={0}
          y={0}
          text="Игрок"
          style={{ font: '24px monospace', color: '#fff' }}
          depth={Depth.AboveWorld}
        />
        <Text
          x={0}
          y={30}
          text={`${Math.max(0, props.playerHealth)}/${props.playerMaxHealth}`}
          style={{ font: '18px monospace', color: '#55ff55' }}
          depth={Depth.AboveWorld}
        />
      </Container>
      
      {/* Индикатор состояния */}
      <Text
        x={400}
        y={50}
        text={props.battleState === 'player_turn' ? '✅ Ваш ход' : '⚠️ Ход врага'}
        style={{ 
          font: '20px monospace', 
          color: props.battleState === 'player_turn' ? '#ffff55' : '#ff5555',
          backgroundColor: '#00000080',
          padding: { x: 10, y: 5 }
        }}
        originX={0.5}
        depth={Depth.AboveWorld}
      />
      
      {/* Подсказки по управлению */}
      <Text
        x={400}
        y={550}
        text="A-Атака | D-Защита | I-Предмет | F-Бегство | SPACE-Быстрая атака"
        style={{ 
          font: '14px monospace', 
          color: '#aaa', 
          backgroundColor: '#00000080',
          padding: { x: 10, y: 5 }
        }}
        originX={0.5}
        depth={Depth.AboveWorld}
      />
    </Container>
  );
}