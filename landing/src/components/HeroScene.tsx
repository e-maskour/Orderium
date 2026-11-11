'use client';

import { useEffect, useRef } from 'react';

/** True only for hardware-accelerated WebGL; software rasterizers would make the page janky. */
function webglOK() {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).toLowerCase();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return !/swiftshader|llvmpipe|softpipe|software|basic render/.test(name);
  } catch {
    return false;
  }
}

/**
 * 3D hero scene. Never blocks first paint: three.js is code-split and only
 * downloaded once the page has loaded and the browser is idle. Until then (and
 * when WebGL is unavailable) the static SVG poster is shown.
 */
export function HeroScene() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let disposed = false;
    let api: { dispose(): void } | undefined;

    const boot = async () => {
      if (disposed || !canvas.current || !webglOK()) return;
      const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      if (conn?.saveData) return;
      const { createScene } = await import('@/three/scene');
      if (disposed || !canvas.current) return;
      api = createScene(canvas.current, {
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      });
    };

    const schedule = () => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(() => void boot(), { timeout: 2000 });
      else setTimeout(() => void boot(), 600);
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });

    return () => {
      disposed = true;
      window.removeEventListener('load', schedule);
      api?.dispose();
    };
  }, []);

  return (
    <div className="hero__scene" aria-hidden="true">
      <div className="hero__poster" />
      <canvas ref={canvas} />
    </div>
  );
}
