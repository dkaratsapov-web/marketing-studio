"use client";

import { useEffect, useRef } from "react";
import styles from "./ShaderBackdrop.module.css";

/**
 * Лёгкий WebGL-фон первого экрана: один фрагментный шейдер на весь холст, без three.js.
 * В шейдер приходят время, прогресс скролла первого экрана (0…1 за два экрана, столько
 * длится закреплённая сцена), курсор и размер. Рендер в пониженном разрешении: фон мягкий,
 * а телефону так легче. Вне экрана кадры не рисуются, при reduced motion — один кадр.
 */
const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const HEAD = `precision mediump float;
uniform vec2 uRes;uniform float uTime;uniform float uProg;uniform vec2 uPtr;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
`;

export default function ShaderBackdrop({ frag, className }: { frag: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "low-power" });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("ShaderBackdrop:", gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, HEAD + frag));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("ShaderBackdrop:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Один треугольник на весь экран
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(prog, "uRes"),
      time: gl.getUniformLocation(prog, "uTime"),
      prog: gl.getUniformLocation(prog, "uProg"),
      ptr: gl.getUniformLocation(prog, "uPtr"),
    };

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.6;
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale));
      const h = Math.max(1, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    const ptr = { x: 0.5, y: 0.5, sx: 0.5, sy: 0.5 };
    const onMove = (e: PointerEvent) => {
      ptr.x = e.clientX / window.innerWidth;
      ptr.y = 1 - e.clientY / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    let visible = true;
    const t0 = performance.now();
    const draw = (now: number) => {
      resize();
      ptr.sx += (ptr.x - ptr.sx) * 0.05;
      ptr.sy += (ptr.y - ptr.sy) * 0.05;
      const prog01 = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 2)));
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.time, still ? 6 : (now - t0) / 1000);
      gl.uniform1f(u.prog, still ? 0.5 : prog01);
      gl.uniform2f(u.ptr, ptr.sx, ptr.sy);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const loop = (now: number) => {
      draw(now);
      if (visible) raf = requestAnimationFrame(loop);
    };

    // В одной пачке может прийти несколько записей: актуальна последняя
    const io = new IntersectionObserver((entries) => {
      visible = entries[entries.length - 1].isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !still) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    if (still) draw(performance.now());
    const onResize = () => still && draw(performance.now());
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [frag]);

  return <canvas ref={ref} className={`${styles.canvas} ${className ?? ""}`} aria-hidden="true" />;
}
