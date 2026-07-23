import React from 'react';
import { View } from 'react-native';

// The SocietyFlats mark — a society facade with a taller door and one gold
// window (the verified flat you find). Plain Views so no SVG dependency.
// Geometry mirrors frontend/src/components/BrandMark.tsx and brand-kit/generate.mjs.
const NAVY = '#233B6E';
const GOLD = '#B08A3E';
const CREAM = '#F8F3EA';

export function BrandMark({ size = 64 }: { size?: number }) {
  const s = size / 512;
  const cell = 76 * s;
  const gap = 32 * s;
  const start = (size - (3 * cell + 2 * gap)) / 2;
  const cells: React.ReactNode[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const lit = row === 1 && col === 2;
      const door = row === 2 && col === 1;
      cells.push(
        <View
          key={`${row}-${col}`}
          style={{
            position: 'absolute',
            left: start + col * (cell + gap),
            top: start + row * (cell + gap),
            width: cell,
            height: door ? cell + 34 * s : cell,
            borderRadius: 20 * s,
            backgroundColor: lit ? GOLD : CREAM,
          }}
        />,
      );
    }
  }
  return <View style={{ width: size, height: size, borderRadius: 118 * s, backgroundColor: NAVY, overflow: 'hidden' }}>{cells}</View>;
}
