"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/**
 * Comparador antes/después con divisor arrastrable. La imagen «antes» (el
 * original) y la «después» (la vista previa editada) se muestran al mismo
 * tamaño con `object-contain`; el divisor vertical descubre una sobre la otra.
 */
export function Comparator({ before, after, alt }: { before: string; after: string; alt: string }) {
  const [position, setPosition] = useState(50);
  const boxRef = useRef<HTMLDivElement>(null);

  function onPointerDown(event: ReactPointerEvent) {
    const box = boxRef.current!;
    const update = (clientX: number) => {
      const rect = box.getBoundingClientRect();
      const pct = ((clientX - rect.left) / rect.width) * 100;
      setPosition(Math.max(0, Math.min(100, pct)));
    };
    update(event.clientX);
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      const rect = boxRef.current!.getBoundingClientRect();
      const pct = ((event.clientX - rect.left) / rect.width) * 100;
      setPosition(Math.max(0, Math.min(100, pct)));
    }
  }

  return (
    <div
      ref={boxRef}
      className="relative h-full w-full touch-none overflow-hidden select-none"
      onPointerMove={onPointerMove}
    >
      {/* Después (base). */}
      {/* eslint-disable-next-line @next/next/no-img-element -- resultado del worker servido como objectURL */}
      <img
        src={after}
        alt={alt}
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain"
      />

      {/* Antes (recortada por el divisor). */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
        aria-hidden="true"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- original cargado por el usuario */}
        <img
          src={before}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
        />
      </div>

      {/* Divisor. */}
      <div
        className="absolute inset-y-0 z-10 w-px bg-surface"
        style={{ left: `${position}%` }}
        aria-hidden="true"
      >
        <div
          role="slider"
          tabIndex={0}
          aria-label="Comparar antes y después"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position)}
          onPointerDown={onPointerDown}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") setPosition((p) => Math.max(0, p - 5));
            if (event.key === "ArrowRight") setPosition((p) => Math.min(100, p + 5));
          }}
          className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-line-strong bg-surface text-text shadow-float"
        >
          <span aria-hidden="true" className="text-caption">
            ⇄
          </span>
        </div>
      </div>
    </div>
  );
}
