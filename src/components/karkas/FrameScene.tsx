"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { karkasState } from "./karkasState";
import styles from "./FrameScene.module.css";

const { clamp, smoothstep, damp, lerp } = THREE.MathUtils;
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/** Дом 6 × 9 м, стены 2,8 м, конёк ещё на 2,2 м выше. Шаг стоек 0,6 м, как в настоящем каркасе */
const W = 6;
const D = 9;
const H = 2.8;
const RIDGE = 2.2;
const STEP = 0.6;
const STUD = 0.09;

type Part = { pos: [number, number, number]; size: [number, number, number]; rot?: [number, number, number]; delay: number };

/** Стойки по периметру с проёмами под окна, обвязка, стропила и обшивка */
function useHouse() {
  return useMemo(() => {
    const studs: Part[] = [];
    const sides: [number, number, "x" | "z"][] = [
      [-D / 2, W, "x"],
      [D / 2, W, "x"],
      [-W / 2, D, "z"],
      [W / 2, D, "z"],
    ];
    // Проёмы окон: по длинной стене два окна, во фронтоне панорамное
    const gap = (axis: "x" | "z", c: number, t: number) =>
      (axis === "x" && t > 0 && Math.abs(c) < 1.1) || (axis === "z" && t > 0 && (Math.abs(c - 2) < 0.65 || Math.abs(c + 1.6) < 0.65));
    sides.forEach(([t, len, axis]) => {
      const n = Math.round(len / STEP);
      for (let i = 0; i <= n; i++) {
        const c = -len / 2 + i * STEP;
        if (gap(axis, c, t) && i !== 0 && i !== n) continue;
        const pos: [number, number, number] = axis === "x" ? [c, H / 2, t] : [t, H / 2, c];
        studs.push({ pos, size: [STUD, H, STUD], delay: (axis === "x" ? 0 : 0.25) + (i / n) * 0.55 });
      }
    });
    // Обвязка: нижняя и верхняя
    const plates: Part[] = [];
    for (const y of [0.05, H]) {
      plates.push({ pos: [0, y, -D / 2], size: [W + STUD, STUD, STUD * 1.6], delay: y > 1 ? 0.85 : 0 });
      plates.push({ pos: [0, y, D / 2], size: [W + STUD, STUD, STUD * 1.6], delay: y > 1 ? 0.85 : 0 });
      plates.push({ pos: [-W / 2, y, 0], size: [STUD * 1.6, STUD, D], delay: y > 1 ? 0.9 : 0.05 });
      plates.push({ pos: [W / 2, y, 0], size: [STUD * 1.6, STUD, D], delay: y > 1 ? 0.9 : 0.05 });
    }
    // Стропила парами вдоль дома и конёк
    const rafters: Part[] = [];
    const len = Math.hypot(W / 2 + 0.35, RIDGE);
    const ang = Math.atan2(RIDGE, W / 2 + 0.35);
    const n = Math.round(D / STEP);
    for (let i = 0; i <= n; i++) {
      const z = -D / 2 + i * STEP;
      const d = i / n;
      rafters.push({ pos: [-(W / 4 + 0.17), H + RIDGE / 2, z], size: [len, STUD * 1.3, STUD], rot: [0, 0, ang], delay: d });
      rafters.push({ pos: [W / 4 + 0.17, H + RIDGE / 2, z], size: [len, STUD * 1.3, STUD], rot: [0, 0, -ang], delay: d });
    }
    rafters.push({ pos: [0, H + RIDGE, 0], size: [STUD * 1.4, STUD * 1.4, D + 0.2], delay: 1 });
    // Сваи фундамента сеткой
    const piles: Part[] = [];
    for (let x = -W / 2; x <= W / 2 + 0.01; x += W / 3)
      for (let z = -D / 2; z <= D / 2 + 0.01; z += D / 4) piles.push({ pos: [x, -0.35, z], size: [0.16, 0.7, 0.16], delay: (((x + 3) * 7 + (z + 5) * 3) % 6) / 10 });
    return { studs, plates, rafters, piles, ang, len };
  }, []);
}

function Beam({ part, mat, edge }: { part: Part; mat: THREE.Material; edge: THREE.LineBasicMaterial }) {
  const geo = useMemo(() => new THREE.BoxGeometry(...part.size), [part]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
  useEffect(() => () => (geo.dispose(), edges.dispose()), [geo, edges]);
  return (
    <group position={part.pos} rotation={part.rot ?? [0, 0, 0]} userData={{ delay: part.delay, y0: part.pos[1] }}>
      <mesh geometry={geo} material={mat} />
      <lineSegments geometry={edges} material={edge} />
    </group>
  );
}

/**
 * Материалы и сетка пола на уровне модуля: их прозрачность меняется каждый кадр, а сцена
 * на странице одна. Модуль грузится только в браузере (динамический импорт без SSR).
 */
const M = {
  wood: new THREE.MeshStandardMaterial({ color: "#d9c39a", roughness: 0.75 }),
  concrete: new THREE.MeshStandardMaterial({ color: "#6d6f73", roughness: 0.9 }),
  line: new THREE.LineBasicMaterial({ color: "#c4f542", transparent: true, opacity: 0.55 }),
  faint: new THREE.LineBasicMaterial({ color: "#c4f542", transparent: true, opacity: 0.18 }),
  wall: new THREE.MeshStandardMaterial({ color: "#3b3e44", roughness: 0.65, transparent: true, side: THREE.DoubleSide }),
  roof: new THREE.MeshStandardMaterial({ color: "#16171a", roughness: 0.5, metalness: 0.3, transparent: true, side: THREE.DoubleSide }),
  glow: new THREE.MeshBasicMaterial({ color: "#ffc56b", transparent: true, opacity: 0, toneMapped: false }),
};
const GRID = new THREE.GridHelper(22, 22, "#c4f542", "#3a3d33");
(GRID.material as THREE.Material).transparent = true;
(GRID.material as THREE.Material).opacity = 0.22;

function House({ still }: { still: boolean }) {
  const house = useHouse();
  const root = useRef<THREE.Group>(null);
  const layers = useRef<Record<string, THREE.Group | null>>({});
  const skin = useRef<THREE.Group>(null);
  const smooth = useRef({ p: still ? 1 : 0, px: 0, py: 0, t0: -1, stage: -1 });
  const pointer = useRef({ x: 0, y: 0 });
  const { size } = useThree();

  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  const m = M;

  // Обшивка: стены, фронтоны и два ската кровли
  const skinGeo = useMemo(() => {
    const gable = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(W / 2, H), new THREE.Vector2(0, H + RIDGE), new THREE.Vector2(-W / 2, H)]);
    const front = new THREE.ShapeGeometry(gable);
    const side = new THREE.PlaneGeometry(D, H);
    const slope = new THREE.PlaneGeometry(house.len + 0.1, D + 0.6);
    return { front, side, slope };
  }, [house.len]);
  useEffect(() => () => Object.values(skinGeo).forEach((g) => g.dispose()), [skinGeo]);

  useFrame((state, delta) => {
    const s = smooth.current;
    const dt = Math.min(delta, 1 / 20);
    const time = state.clock.elapsedTime;
    if (still) s.p = 1;
    else if (karkasState.auto) {
      if (s.t0 < 0) s.t0 = time;
      const c = ((time - s.t0) % 12) / 12;
      s.p = c < 0.6 ? smoothstep(c, 0.02, 0.6) : c < 0.85 ? 1 : 1 - smoothstep(c, 0.85, 0.99);
    } else s.p = damp(s.p, karkasState.progress, 5, dt);
    s.px = damp(s.px, pointer.current.x, 3, dt);
    s.py = damp(s.py, pointer.current.y, 3, dt);
    const p = s.p;

    // Этапы: фундамент → стойки → стропила → обшивка → готовый дом
    const phase = (a: number, b: number) => clamp((p - a) / (b - a), 0, 1);
    const ph = { piles: phase(-0.06, 0.12), studs: phase(0.1, 0.42), plates: phase(0.1, 0.45), rafters: phase(0.42, 0.66), skin: phase(0.64, 0.86), done: phase(0.86, 1) };
    for (const key of ["piles", "studs", "plates", "rafters"] as const) {
      const g = layers.current[key];
      if (!g) continue;
      const t = ph[key];
      g.children.forEach((c) => {
        const k = ease(clamp(t * 1.6 - (c.userData.delay as number) * 0.6, 0, 1));
        c.visible = k > 0.001;
        if (key === "rafters") {
          c.scale.setScalar(Math.max(k, 0.001));
          c.position.y = (c.userData.y0 as number) + (1 - k) * 1.5;
        } else c.scale.set(1, Math.max(k, 0.001), 1);
      });
    }
    const sk = ease(ph.skin);
    m.wall.opacity = sk * 0.92;
    m.roof.opacity = ease(clamp(ph.skin * 1.4 - 0.4, 0, 1));
    if (skin.current) skin.current.visible = sk > 0.01;
    m.line.opacity = lerp(0.6, 0.25, sk);
    m.glow.opacity = ease(ph.done) * 0.95;

    const stage = Math.min(4, Math.floor(p * 5));
    if (stage !== s.stage) {
      s.stage = stage;
      karkasState.onStage?.(Math.max(0, stage));
    }

    const r = root.current;
    if (r) {
      const narrow = size.width < 560;
      r.scale.setScalar(narrow ? 0.62 : 0.78);
      r.rotation.y = lerp(-0.95, -0.35, ease(p)) + s.px * 0.18 + (still ? 0 : Math.sin(time * 0.25) * 0.03);
      r.rotation.x = 0.06 - s.py * 0.05;
      r.position.y = -1.9;
    }
  });

  return (
    <group ref={root}>
      <primitive object={GRID} position={[0, -0.7, 0]} />
      <group ref={(g) => void (layers.current.piles = g)}>
        {house.piles.map((part, i) => (
          <Beam key={i} part={part} mat={m.concrete} edge={m.faint} />
        ))}
      </group>
      <group ref={(g) => void (layers.current.plates = g)}>
        {house.plates.map((part, i) => (
          <Beam key={i} part={part} mat={m.wood} edge={m.line} />
        ))}
      </group>
      <group ref={(g) => void (layers.current.studs = g)}>
        {house.studs.map((part, i) => (
          // стойка растёт от низа: опорная точка на полу
          <group key={i} position={[part.pos[0], 0, part.pos[2]]} userData={{ delay: part.delay }}>
            <Beam part={{ ...part, pos: [0, H / 2, 0] }} mat={m.wood} edge={m.line} />
          </group>
        ))}
      </group>
      <group ref={(g) => void (layers.current.rafters = g)}>
        {house.rafters.map((part, i) => (
          <Beam key={i} part={part} mat={m.wood} edge={m.line} />
        ))}
      </group>
      <group ref={skin}>
        <mesh geometry={skinGeo.front} material={m.wall} position={[0, 0, D / 2 + 0.06]} />
        <mesh geometry={skinGeo.front} material={m.wall} position={[0, 0, -D / 2 - 0.06]} />
        <mesh geometry={skinGeo.side} material={m.wall} position={[W / 2 + 0.06, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} />
        <mesh geometry={skinGeo.side} material={m.wall} position={[-W / 2 - 0.06, H / 2, 0]} rotation={[0, Math.PI / 2, 0]} />
        <group position={[-(W / 4 + 0.17), H + RIDGE / 2 + 0.08, 0]} rotation={[0, 0, house.ang]}>
          <mesh geometry={skinGeo.slope} material={m.roof} rotation={[-Math.PI / 2, 0, 0]} />
        </group>
        <group position={[W / 4 + 0.17, H + RIDGE / 2 + 0.08, 0]} rotation={[0, 0, -house.ang]}>
          <mesh geometry={skinGeo.slope} material={m.roof} rotation={[-Math.PI / 2, 0, 0]} />
        </group>
        {/* Тёплый свет в окнах: панорама во фронтоне и два окна на длинной стене */}
        <mesh position={[0, 1.35, D / 2 + 0.08]} material={m.glow}>
          <planeGeometry args={[2.1, 2.5]} />
        </mesh>
        <mesh position={[W / 2 + 0.08, 1.5, 2]} rotation={[0, Math.PI / 2, 0]} material={m.glow}>
          <planeGeometry args={[1.2, 1.4]} />
        </mesh>
        <mesh position={[W / 2 + 0.08, 1.5, -1.6]} rotation={[0, Math.PI / 2, 0]} material={m.glow}>
          <planeGeometry args={[1.2, 1.4]} />
        </mesh>
      </group>
    </group>
  );
}

/** Холст каркаса и подписи этапов */
export default function FrameScene({ stages }: { stages: string[] }) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [active, setActive] = useState(0);
  const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    karkasState.onStage = setActive;
    const io = new IntersectionObserver((es) => setVisible(es[es.length - 1].isIntersecting), { rootMargin: "100px" });
    if (host.current) io.observe(host.current);
    return () => {
      io.disconnect();
      karkasState.onStage = null;
    };
  }, []);

  return (
    <div ref={host} className={styles.host}>
      <Canvas
        className={styles.canvas}
        dpr={[1, 1.75]}
        frameloop={visible ? "always" : "never"}
        camera={{ position: [9, 5.5, 12], fov: 32, near: 0.1, far: 80 }}
        gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(0x000000, 0);
          camera.lookAt(0, 0.4, 0);
        }}
        aria-hidden="true"
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[6, 10, 8]} intensity={1.6} />
        <directionalLight position={[-8, 4, -6]} intensity={0.5} color="#c4f542" />
        <House still={still} />
      </Canvas>
      <ol className={styles.stages} aria-hidden="true">
        {stages.map((s, i) => (
          <li key={s} className={styles.stage} data-on={i <= (still ? stages.length - 1 : active) || undefined} data-now={i === active || undefined}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
