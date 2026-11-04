import React, { useRef, useEffect } from 'react';
import type { FallingObject } from '../types';

interface PlayfieldCanvasProps {
  objects: FallingObject[];
  basketX: number; // Normalized 0 - 100 percentage
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

  // Cached layout dimensions in CSS pixels (updated via ResizeObserver, zero layout thrashing in RAF)
  const layoutRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 0,
    height: 0,
    dpr: 1,
  });

  // Fast direct input tracking
  const liveBasketX = useRef<number>(basketX);
  const isDraggingRef = useRef<boolean>(false);
  const objectsRef = useRef<FallingObject[]>(objects);
  const activeTurnRef = useRef<boolean>(isActiveTurn);
  const activeNameRef = useRef<string>(activePlayerName);

  // Keep refs up-to-date without triggering re-initialization of RAF loop
  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  useEffect(() => {
    activeTurnRef.current = isActiveTurn;
  }, [isActiveTurn]);

  useEffect(() => {
    activeNameRef.current = activePlayerName;
  }, [activePlayerName]);

  // Synchronize incoming authoritative basket position (e.g. for observers or turn switches)
  useEffect(() => {
    if (!activeTurnRef.current || !isDraggingRef.current) {
      liveBasketX.current = basketX;
    }
  }, [basketX]);

  // Direct fast-path pointer handling (immediate responsive drag for mouse & touch)
  const updatePointerCoord = (clientX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0) return;

    const relativeX = clientX - rect.left;
    let percentX = (relativeX / rect.width) * 100;
    // Strict boundary clamping so basket never clips outside arena
    percentX = Math.max(9, Math.min(91, percentX));

    // Update live coordinate immediately for next screen paint
    liveBasketX.current = percentX;

    // Dispatch to parent / network with zero visual delay
    onBasketMove(percentX);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeTurnRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}
    isDraggingRef.current = true;
    updatePointerCoord(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeTurnRef.current) return;
    // On laptop/desktop, move with cursor hover even without clicking, or during touch drag
    if (e.pointerType === 'mouse' || isDraggingRef.current) {
      updatePointerCoord(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeTurnRef.current) return;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
    isDraggingRef.current = false;
  };

  // Keyboard navigation for Desktop / Laptop (Left/Right, A/D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeTurnRef.current) return;
      let step = 0;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        step = -3.5;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        step = 3.5;
      }
      if (step !== 0) {
        e.preventDefault();
        const nextX = Math.max(9, Math.min(91, liveBasketX.current + step));
        liveBasketX.current = nextX;
        onBasketMove(nextX);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBasketMove]);

  // Keep canvas internal pixel buffer synchronized with display size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for optimal mobile battery & 60fps
      const displayW = Math.round(rect.width * dpr);
      const displayH = Math.round(rect.height * dpr);

      layoutRef.current = {
        width: rect.width,
        height: rect.height,
        dpr: dpr,
      };

      if (displayW > 0 && displayH > 0 && (canvas.width !== displayW || canvas.height !== displayH)) {
        canvas.width = displayW;
        canvas.height = displayH;
      }
    };

    updateCanvasDimensions();
    const observer = new ResizeObserver(() => updateCanvasDimensions());
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    window.addEventListener('resize', updateCanvasDimensions);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateCanvasDimensions);
    };
  }, []);

  // 60 FPS Render Loop (Decoupled from React renders, uses cached layout and live refs)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animFrameId: number;

    const render = () => {
      const { width: cssWidth, height: cssHeight, dpr } = layoutRef.current;

      if (cssWidth > 0 && cssHeight > 0) {
        // Reset transform & clear full canvas buffer
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Scale into CSS space (1:1 with client touch/mouse coordinates)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const currentObjects = objectsRef.current;
        const isActive = activeTurnRef.current;
        const playerName = activeNameRef.current;
        const basketCoordX = liveBasketX.current;

        // Is viewport small mobile?
        const isMobileScreen = cssWidth < 640;

        // 1. RENDER FALLING OBJECTS (HEARTS & BOMBS)
        for (let i = 0; i < currentObjects.length; i++) {
          const obj = currentObjects[i];
          if (obj.caught || obj.expired) continue;

          const x = (obj.x / 100) * cssWidth;
          const y = (obj.y / 100) * cssHeight;
          const sizePx = Math.max(isMobileScreen ? 36 : 40, (obj.size / 100) * cssWidth);

          ctx.save();
          ctx.translate(x, y);

          if (obj.type === 'BOMB') {
            // --- BOMB GRAPHIC ---
            ctx.beginPath();
            ctx.arc(0, 0, sizePx * 0.44, 0, Math.PI * 2);
            const bombGrad = ctx.createRadialGradient(-3, -5, 2, 0, 0, sizePx * 0.44);
            bombGrad.addColorStop(0, '#64748b');
            bombGrad.addColorStop(0.55, '#1e293b');
            bombGrad.addColorStop(1, '#090d16');
            ctx.fillStyle = bombGrad;
            ctx.shadowColor = 'rgba(239, 68, 68, 0.7)';
            ctx.shadowBlur = 10;
            ctx.fill();

            // Fuse cap
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(-sizePx * 0.1, -sizePx * 0.52, sizePx * 0.2, sizePx * 0.12);

            // Animated Fuse Spark
            ctx.beginPath();
            ctx.arc(sizePx * 0.12, -sizePx * 0.62, 3.5 + Math.random() * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#f59e0b';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 12;
            ctx.fill();

            // Danger Bomb Icon
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
            ctx.shadowBlur = isGold ? 14 : 9;

            // Heart shape bezier path
            ctx.beginPath();
            const topCurveHeight = heartH * 0.3;
            ctx.moveTo(0, topCurveHeight);
            ctx.bezierCurveTo(
              -heartW / 2, -heartH / 3,
              -heartW / 2, heartH / 3,
              0, heartH * 0.6
            );
            ctx.bezierCurveTo(
              heartW / 2, heartH / 3,
              heartW / 2, -heartH / 3,
              0, topCurveHeight
            );
            ctx.closePath();

            // Fill gradient
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

            // Border
            ctx.strokeStyle = isGold ? '#fef9c3' : '#ffe4e6';
            ctx.lineWidth = 1.6;
            ctx.stroke();

            // Opponent name tag ribbon
            if (obj.nameTag) {
              const ribbonW = Math.min(heartW * 1.35, isMobileScreen ? 82 : 92);
              const ribbonH = isMobileScreen ? 17 : 19;
              const ribbonY = heartH * 0.08;

              ctx.shadowBlur = 0;
              ctx.fillStyle = isGold ? 'rgba(69, 26, 3, 0.88)' : 'rgba(76, 5, 25, 0.90)';
              ctx.beginPath();
              ctx.roundRect(-ribbonW / 2, ribbonY, ribbonW, ribbonH, 9);
              ctx.fill();

              ctx.strokeStyle = isGold ? '#fbbf24' : '#fda4af';
              ctx.lineWidth = 1.1;
              ctx.stroke();

              ctx.fillStyle = '#ffffff';
              ctx.font = `bold ${isMobileScreen ? 10 : 11}px system-ui, -apple-system, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(obj.nameTag, 0, ribbonY + ribbonH / 2);
            }
          }

          ctx.restore();
        }

        // 2. RENDER BASKET (PROMINENT, FLUID & RESPONSIVELY SIZED)
        // Basket width: 22% on mobile, 18% on desktop for comfortable touch handling
        const basketWidthFactor = isMobileScreen ? 0.22 : 0.18;
        const basketWidthPx = basketWidthFactor * cssWidth;
        const basketHeightPx = Math.max(38, 0.08 * cssHeight);
        const basketPxX = (basketCoordX / 100) * cssWidth;
        const basketPxY = 0.88 * cssHeight;

        ctx.save();
        ctx.translate(basketPxX, basketPxY);

        // Basket Glow
        ctx.shadowColor = isActive ? 'rgba(244, 63, 94, 0.85)' : 'rgba(148, 163, 184, 0.5)';
        ctx.shadowBlur = isMobileScreen ? 14 : 20;

        // Rich arcade gradient
        const basketGrad = ctx.createLinearGradient(0, -basketHeightPx / 2, 0, basketHeightPx / 2);
        if (isActive) {
          basketGrad.addColorStop(0, '#f43f5e');
          basketGrad.addColorStop(0.35, '#e11d48');
          basketGrad.addColorStop(0.75, '#9f1239');
          basketGrad.addColorStop(1, '#4c0519');
        } else {
          basketGrad.addColorStop(0, '#64748b');
          basketGrad.addColorStop(0.5, '#334155');
          basketGrad.addColorStop(1, '#0f172a');
        }

        ctx.beginPath();
        const halfW = basketWidthPx / 2;
        const halfH = basketHeightPx / 2;
        ctx.moveTo(-halfW, -halfH);
        ctx.lineTo(halfW, -halfH);
        ctx.quadraticCurveTo(halfW - 3, halfH, halfW * 0.65, halfH);
        ctx.lineTo(-halfW * 0.65, halfH);
        ctx.quadraticCurveTo(-halfW + 3, halfH, -halfW, -halfH);
        ctx.closePath();
        ctx.fillStyle = basketGrad;
        ctx.fill();

        // Golden rim stroke
        ctx.strokeStyle = isActive ? '#fbbf24' : '#cbd5e1';
        ctx.lineWidth = isMobileScreen ? 3.5 : 4;
        ctx.stroke();

        // Top catch lip pill
        ctx.fillStyle = isActive ? '#f59e0b' : '#94a3b8';
        ctx.beginPath();
        ctx.roundRect(-halfW - 2, -halfH - 3, basketWidthPx + 4, 6, 3);
        ctx.fill();

        // Inner depth shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, -halfH + 2, halfW * 0.85, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Basket label
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${isMobileScreen ? 10 : 11}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const labelText = playerName ? `${playerName}'s Basket` : 'Catch Hearts';
        ctx.fillText(labelText, 0, halfH + (isMobileScreen ? 4 : 6));

        ctx.restore();
      }

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameId);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full touch-none select-none overflow-hidden cursor-ew-resize overscroll-none"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none select-none overscroll-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
};
