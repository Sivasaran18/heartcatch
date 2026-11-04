import React, { useRef } from 'react';
import { View, StyleSheet, PanResponder, Text } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Circle,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { FallingObject } from '../../types';

interface PlayfieldProps {
  width: number;
  height: number;
  objects: FallingObject[];
  basketX: number; // Normalized 0.0 - 100.0
  isActiveTurn: boolean;
  onBasketMove: (x: number) => void;
  activePlayerName: string;
}

export const PlayfieldArena: React.FC<PlayfieldProps> = ({
  width,
  height,
  objects,
  basketX,
  isActiveTurn,
  onBasketMove,
  activePlayerName,
}) => {
  // Use a local ref to track movement accurately
  const lastXRef = useRef(basketX);
  lastXRef.current = basketX;

  // React Native PanResponder for smooth, zero-latency touch dragging
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isActiveTurn,
      onMoveShouldSetPanResponder: () => isActiveTurn,
      onPanResponderGrant: (evt) => {
        if (!isActiveTurn || width <= 0) return;
        const touchX = evt.nativeEvent.locationX;
        let percentX = (touchX / width) * 100;
        percentX = Math.max(9, Math.min(91, percentX));
        onBasketMove(percentX);
      },
      onPanResponderMove: (evt) => {
        if (!isActiveTurn || width <= 0) return;
        const touchX = evt.nativeEvent.locationX;
        let percentX = (touchX / width) * 100;
        percentX = Math.max(9, Math.min(91, percentX));
        onBasketMove(percentX);
      },
      onPanResponderRelease: () => {},
      onPanResponderTerminate: () => {},
    })
  ).current;

  // Basket geometry
  // Width: 20% of arena, Height: 7.5% of arena, Y: exactly 88%
  const basketWidthPx = width * 0.22;
  const basketHeightPx = height * 0.075;
  const basketPxX = (basketX / 100) * width;
  const basketPxY = height * 0.88;

  return (
    <View style={[styles.container, { width, height }]} {...panResponder.panHandlers}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Normal Heart Gradient */}
          <LinearGradient id="heartGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#fda4af" />
            <Stop offset="45%" stopColor="#f43f5e" />
            <Stop offset="100%" stopColor="#be123c" />
          </LinearGradient>

          {/* Golden Heart Gradient */}
          <LinearGradient id="goldHeartGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#fef08a" />
            <Stop offset="50%" stopColor="#f59e0b" />
            <Stop offset="100%" stopColor="#b45309" />
          </LinearGradient>

          {/* Bomb Radial Gradient */}
          <RadialGradient id="bombGrad" cx="35%" cy="35%" r="65%">
            <Stop offset="0%" stopColor="#64748b" />
            <Stop offset="60%" stopColor="#1e293b" />
            <Stop offset="100%" stopColor="#090d16" />
          </RadialGradient>

          {/* Active Basket Gradient */}
          <LinearGradient id="basketGradActive" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#f43f5e" />
            <Stop offset="50%" stopColor="#be123c" />
            <Stop offset="100%" stopColor="#4c0519" />
          </LinearGradient>

          {/* Observer Basket Gradient */}
          <LinearGradient id="basketGradInactive" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#64748b" />
            <Stop offset="50%" stopColor="#334155" />
            <Stop offset="100%" stopColor="#0f172a" />
          </LinearGradient>
        </Defs>

        {/* 1. RENDER FALLING OBJECTS (HEARTS AND BOMBS) */}
        {objects.map((obj) => {
          if (obj.caught || obj.expired) return null;

          const objPxX = (obj.x / 100) * width;
          const objPxY = (obj.y / 100) * height;
          const sizePx = Math.max(36, (obj.size / 100) * width);

          if (obj.type === 'BOMB') {
            // Dark Bomb with Fuse and Spark
            return (
              <React.Fragment key={obj.id}>
                {/* Fuse line */}
                <Path
                  d={`M ${objPxX} ${objPxY - sizePx * 0.42} Q ${objPxX + 6} ${objPxY - sizePx * 0.65} ${objPxX + 12} ${objPxY - sizePx * 0.7}`}
                  stroke="#fbbf24"
                  strokeWidth="2.5"
                  fill="none"
                />
                {/* Fuse Spark */}
                <Circle cx={objPxX + 12} cy={objPxY - sizePx * 0.7} r={4.5} fill="#f97316" />
                <Circle cx={objPxX + 12} cy={objPxY - sizePx * 0.7} r={2} fill="#fef08a" />
                {/* Bomb Body */}
                <Circle
                  cx={objPxX}
                  cy={objPxY}
                  r={sizePx * 0.44}
                  fill="url(#bombGrad)"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                />
                {/* Bomb Symbol */}
                <SvgText
                  x={objPxX}
                  y={objPxY + 4}
                  textAnchor="middle"
                  fontSize="14"
                  fill="#ffffff"
                  fontWeight="bold"
                >
                  💣
                </SvgText>
              </React.Fragment>
            );
          }

          // Heart Object (Normal or Golden)
          const isGold = obj.type === 'GOLDEN_HEART';
          const heartW = sizePx * 1.1;
          const heartH = sizePx * 1.05;

          // Heart path centered at (objPxX, objPxY)
          const heartPath = `
            M ${objPxX} ${objPxY + heartH * 0.42}
            C ${objPxX - heartW * 0.55} ${objPxY + heartH * 0.15}, ${objPxX - heartW * 0.6} ${objPxY - heartH * 0.35}, ${objPxX} ${objPxY - heartH * 0.22}
            C ${objPxX + heartW * 0.6} ${objPxY - heartH * 0.35}, ${objPxX + heartW * 0.55} ${objPxY + heartH * 0.15}, ${objPxX} ${objPxY + heartH * 0.42}
            Z
          `;

          const ribbonW = Math.min(heartW * 1.25, 80);
          const ribbonH = 18;
          const ribbonY = objPxY - ribbonH / 2;

          return (
            <React.Fragment key={obj.id}>
              {/* Heart Shape */}
              <Path
                d={heartPath}
                fill={isGold ? 'url(#goldHeartGrad)' : 'url(#heartGrad)'}
                stroke={isGold ? '#fef08a' : '#ffe4e6'}
                strokeWidth="2"
              />

              {/* Opponent's confirmed real name tag */}
              {obj.nameTag ? (
                <>
                  <Rect
                    x={objPxX - ribbonW / 2}
                    y={ribbonY}
                    width={ribbonW}
                    height={ribbonH}
                    rx={9}
                    ry={9}
                    fill={isGold ? 'rgba(69, 26, 3, 0.88)' : 'rgba(76, 5, 25, 0.90)'}
                    stroke={isGold ? '#fbbf24' : '#fda4af'}
                    strokeWidth="1.2"
                  />
                  <SvgText
                    x={objPxX}
                    y={ribbonY + 13}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    {obj.nameTag}
                  </SvgText>
                </>
              ) : null}
            </React.Fragment>
          );
        })}

        {/* 2. RENDER BASKET (PROMINENT, VISIBLE & ACCURATELY POSITIONED) */}
        {(() => {
          const halfW = basketWidthPx / 2;
          const halfH = basketHeightPx / 2;
          const left = basketPxX - halfW;
          const right = basketPxX + halfW;
          const top = basketPxY - halfH;
          const bottom = basketPxY + halfH;

          // Distinct arcade basket path: wide top rim tapering smoothly into a stable rounded base
          const basketPath = `
            M ${left} ${top}
            L ${right} ${top}
            Q ${right - 4} ${bottom} ${basketPxX + halfW * 0.6} ${bottom}
            L ${basketPxX - halfW * 0.6} ${bottom}
            Q ${left + 4} ${bottom} ${left} ${top}
            Z
          `;

          return (
            <React.Fragment>
              {/* Basket Body */}
              <Path
                d={basketPath}
                fill={isActiveTurn ? 'url(#basketGradActive)' : 'url(#basketGradInactive)'}
                stroke={isActiveTurn ? '#fbbf24' : '#94a3b8'}
                strokeWidth="3.5"
              />

              {/* Basket Golden Top Catch Lip / Rim */}
              <Rect
                x={left - 3}
                y={top - 3}
                width={basketWidthPx + 6}
                height={7}
                rx={3.5}
                ry={3.5}
                fill={isActiveTurn ? '#fbbf24' : '#94a3b8'}
              />

              {/* Basket Inner Shadow / Depth opening */}
              <Rect
                x={left + 5}
                y={top + 2}
                width={basketWidthPx - 10}
                height={4}
                rx={2}
                ry={2}
                fill="rgba(0,0,0,0.4)"
              />

              {/* Player Basket Name Tag */}
              <SvgText
                x={basketPxX}
                y={bottom + 15}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="11"
                fontWeight="bold"
              >
                {activePlayerName ? `${activePlayerName}'s Basket` : 'Catch Hearts'}
              </SvgText>
            </React.Fragment>
          );
        })()}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});

