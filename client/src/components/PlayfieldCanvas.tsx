import React, { useRef, useEffect } from 'react';
import type { FallingObject } from '../types';

interface PlayfieldCanvasProps {
  objects: FallingObject[];
  basketX: number; // 0 - 100
  isActiveTurn: boolean;
  onBasketMove: (x: number) => void;
  activePlayerName: string;
}

export const PlayfieldCanvas: React.FC<PlayfieldCanvasProps> = ({
  objects,
  basketX,
  isActiveTurn,
  onBasketMove,
  activePlayerName,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  // Smooth local interpolated basket coordinate
  const currentBasketX = useRef(basketX);
  useEffect(() => {
    currentBasketX.current = basketX;
  }, [basketX]);

  // Pointer event handlers for mobile touch and desktop mouse movement
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActiveTurn) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    updateBasketFromEvent(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActiveTurn) return;
    // On laptop/desktop, move with mouse cursor even without clicking, or during dragging
    if (e.pointerType === 'mouse' || isDraggingRef.current) {
      updateBasketFromEvent(e);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isActiveTurn) return;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    isDraggingRef.current = false;
  };

  const updateBasketFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0) return;
    const clientX = e.clientX - rect.left;
    let percentX = (clientX / rect.width) * 100;
    percentX = Math.max(9, Math.min(91, percentX));
    onBasketMove(percentX);
  };

  // Keyboard navigation for Desktop (Left/Right, A/D)
  useEffect(() => {
    if (!isActiveTurn) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      let step = 0;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        step = -4;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        step = 4;
      }
      if (step !== 0) {
        e.preventDefault();
        const nextX = Math.max(9, Math.min(91, currentBasketX.current + step));
        onBasketMove(nextX);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActiveTurn, onBasketMove]);

  // Keep canvas internal pixel resolution synchronized with its display size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const displayW = Math.round(rect.width * dpr);
      const displayH = Math.round(rect.height * dpr);

      if (displayW > 0 && displayH > 0 && (canvas.width !== displayW || canvas.height !== displayH)) {
        canvas.width = displayW;
        canvas.height = displayH;
      }
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(() => resizeCanvas());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    window.addEventListener('resize', resizeCanvas);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // High performance Canvas 2D render loop (draws in CSS coordinate space)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const cssWidth = rect.width;
      const cssHeight = rect.height;

      if (cssWidth <= 0 || cssHeight <= 0) {
        animFrameId = requestAnimationFrame(render);
        return;
      }

      const dpr = window.devicePixelRatio || 1;

      // Reset transform and clear entire backing buffer
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Scale to CSS coordinate space so all drawing math aligns 1:1 with mouse events and CSS
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 1. RENDER FALLING OBJECTS (HEARTS AND BOMBS)
      objects.forEach((obj) => {
        if (obj.caught || obj.expired) return;

        const x = (obj.x / 100) * cssWidth;
        const y = (obj.y / 100) * cssHeight;
        const sizePx = Math.max(34, (obj.size / 100) * cssWidth);

        ctx.save();
        ctx.translate(x, y);

        if (obj.type === 'BOMB') {
          // --- BOMB GRAPHIC ---
          ctx.beginPath();
          ctx.arc(0, 0, sizePx * 0.45, 0, Math.PI * 2);
          const bombGrad = ctx.createRadialGradient(-4, -6, 2, 0, 0, sizePx * 0.45);
          bombGrad.addColorStop(0, '#475569');
          bombGrad.addColorStop(0.6, '#1e293b');
          bombGrad.addColorStop(1, '#090d16');
          ctx.fillStyle = bombGrad;
          ctx.shadowColor = 'rgba(239, 68, 68, 0.7)';
          ctx.shadowBlur = 12;
          ctx.fill();

          // Cap & Fuse
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(-sizePx * 0.1, -sizePx * 0.52, sizePx * 0.2, sizePx * 0.12);

          // Animated Fuse Spark
          ctx.beginPath();
          ctx.arc(sizePx * 0.12, -sizePx * 0.62, 4 + Math.random() * 3, 0, Math.PI * 2);
          ctx.fillStyle = '#f59e0b';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 14;
          ctx.fill();

          // Bomb Warning Icon
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 15px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('💣', 0, 1);
        } else {
          // --- HEART GRAPHIC (NORMAL OR GOLDEN) ---
          const isGold = obj.type === 'GOLDEN_HEART';
          const heartW = sizePx * 1.05;
          const heartH = sizePx * 1.0;

          ctx.shadowColor = isGold ? 'rgba(251, 191, 36, 0.9)' : 'rgba(244, 63, 94, 0.7)';
          ctx.shadowBlur = isGold ? 16 : 10;

          // Draw Heart Shape using bezier curves
          ctx.beginPath();
          const topCurveHeight = heartH * 0.3;
          ctx.moveTo(0, topCurveHeight);
          // Top Left lobe
          ctx.bezierCurveTo(
            -heartW / 2, -heartH / 3,
            -heartW / 2, heartH / 3,
            0, heartH * 0.6
          );
          // Top Right lobe
          ctx.bezierCurveTo(
            heartW / 2, heartH / 3,
            heartW / 2, -heartH / 3,
            0, topCurveHeight
          );
          ctx.closePath();

          // Fill Heart Gradient
          const heartGrad = ctx.createLinearGradient(0, -heartH / 3, 0, heartH * 0.6);
          if (isGold) {
            heartGrad.addColorStop(0, '#fef08a');
            heartGrad.addColorStop(0.5, '#f59e0b');
            heartGrad.addColorStop(1, '#b45309');
          } else {
            heartGrad.addColorStop(0, '#fda4af');
            heartGrad.addColorStop(0.4, '#f43f5e');
            heartGrad.addColorStop(1, '#be123c');
          }
          ctx.fillStyle = heartGrad;
          ctx.fill();

          // Outer Border
          ctx.strokeStyle = isGold ? '#fef9c3' : '#ffe4e6';
          ctx.lineWidth = 1.8;
          ctx.stroke();

          // NAME TAG RIBBON / BADGE (CRITICAL: Displays opponent's confirmed real name)
          if (obj.nameTag) {
            const ribbonW = Math.min(heartW * 1.35, 90);
            const ribbonH = 18;
            const ribbonY = heartH * 0.08;

            ctx.shadowBlur = 0;
            ctx.fillStyle = isGold ? 'rgba(69, 26, 3, 0.88)' : 'rgba(76, 5, 25, 0.90)';
            ctx.beginPath();
            ctx.roundRect(-ribbonW / 2, ribbonY, ribbonW, ribbonH, 9);
            ctx.fill();

            ctx.strokeStyle = isGold ? '#fbbf24' : '#fda4af';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Name text inside heart ribbon
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(obj.nameTag, 0, ribbonY + ribbonH / 2);
          }
        }

        ctx.restore();
      });

      // 2. RENDER BASKET (CLEARLY VISIBLE, PROMINENT AND ACCURATELY SIZED)
      // Height: 8% of playfield, Y: 88%, Width: 18%
      const basketPxX = (currentBasketX.current / 100) * cssWidth;
      const basketPxY = 0.88 * cssHeight;
      const basketWidthPx = 0.18 * cssWidth;
      const basketHeightPx = 0.08 * cssHeight;

      ctx.save();
      ctx.translate(basketPxX, basketPxY);

      // Distinct Basket Glow
      ctx.shadowColor = isActiveTurn ? 'rgba(244, 63, 94, 0.85)' : 'rgba(148, 163, 184, 0.5)';
      ctx.shadowBlur = 20;

      // Basket Body Gradient (Rich berry/cherry arcade container)
      const basketGrad = ctx.createLinearGradient(0, -basketHeightPx / 2, 0, basketHeightPx / 2);
      if (isActiveTurn) {
        basketGrad.addColorStop(0, '#f43f5e');
        basketGrad.addColorStop(0.4, '#e11d48');
        basketGrad.addColorStop(0.8, '#9f1239');
        basketGrad.addColorStop(1, '#4c0519');
      } else {
        basketGrad.addColorStop(0, '#64748b');
        basketGrad.addColorStop(0.5, '#334155');
        basketGrad.addColorStop(1, '#0f172a');
      }

      ctx.beginPath();
      // Curved arcade basket shape: wide open top rim tapering to rounded bottom
      const halfW = basketWidthPx / 2;
      const halfH = basketHeightPx / 2;
      ctx.moveTo(-halfW, -halfH);
      ctx.lineTo(halfW, -halfH);
      ctx.quadraticCurveTo(halfW - 4, halfH, halfW * 0.65, halfH);
      ctx.lineTo(-halfW * 0.65, halfH);
      ctx.quadraticCurveTo(-halfW + 4, halfH, -halfW, -halfH);
      ctx.closePath();
      ctx.fillStyle = basketGrad;
      ctx.fill();

      // Golden Rim around the top catch lip
      ctx.strokeStyle = isActiveTurn ? '#fbbf24' : '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Top catch lip pill / rim highlight
      ctx.fillStyle = isActiveTurn ? '#f59e0b' : '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(-halfW - 2, -halfH - 3, basketWidthPx + 4, 6, 3);
      ctx.fill();

      // Inner opening depth shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, -halfH + 2, halfW * 0.85, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Basket Front Label / Name Tag
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const labelText = activePlayerName ? `${activePlayerName}'s Basket` : 'Catch Hearts';
      ctx.fillText(labelText, 0, halfH + 6);

      ctx.restore();

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameId);
  }, [objects, isActiveTurn, activePlayerName]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full touch-none select-none overflow-hidden cursor-ew-resize"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
};
