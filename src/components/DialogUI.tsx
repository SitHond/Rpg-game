// src/components/DialogUI.tsx - ПРОСТОЙ КОМПОНЕНТ БЕЗ ИНТЕРАКТИВНОСТИ
import { Container, Text } from 'phaser-jsx';
import { Depth } from '../constants';
import { DialogChoice } from '../types/dialog';

interface Props {
  speaker: string;
  text: string;
  choices?: DialogChoice[];
  selectedChoice: number;
  dialogState: string;
}

export function DialogUI(props: Props) {
  return (
    <Container x={0} y={0}>
      {/* Имя говорящего */}
      <Text
        x={100}
        y={380}
        text={props.speaker}
        style={{
          font: 'bold 20px monospace',
          color: '#ffff00',
          backgroundColor: '#00000080',
          padding: { x: 10, y: 5 }
        }}
        depth={Depth.AboveWorld}
      />
      
      {/* Текст диалога */}
      <Text
        x={100}
        y={420}
        text={props.text}
        style={{
          font: '18px monospace',
          color: '#fff',
          backgroundColor: '#000000c0',
          padding: { x: 15, y: 10 },
          wordWrap: { width: 600 }
        }}
        depth={Depth.AboveWorld}
      />
      
      {/* Варианты выбора */}
      {props.choices && props.dialogState === 'choice' && (
        <Container x={100} y={460}>
          {props.choices.map((choice, index) => (
            <Text
             // key={choice.id}
              x={20}
              y={index * 35}
              text={`${index === props.selectedChoice ? '> ' : '  '}${choice.text}`}
              style={{
                font: '18px monospace',
                color: index === props.selectedChoice ? '#ffff00' : '#ccc',
                backgroundColor: index === props.selectedChoice ? '#33330080' : '#00000080',
                padding: { x: 15, y: 8 }
              }}
              depth={Depth.AboveWorld}
            />
          ))}
        </Container>
      )}
    </Container>
  );
}