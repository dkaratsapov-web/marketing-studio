"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { buildState } from "./buildState";
import styles from "./SiteBuilding.module.css";

/** Модуль здания: одна страница сайта */
const S = 0.42;
const GAP = 0.05;
const HT = 0.3;
const STEP_XZ = S + GAP;
const STEP_Y = HT + 0.04;
const { clamp, smoothstep, damp } = THREE.MathUtils;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Цвета кластеров как в легенде: пара салатовая и розовая, дальше белый, тёмно-салатовый, серый, графит */
const COLORS = ["#c4f542", "#ff4d9d", "#ecece8", "#4a6420", "#8a8a92", "#4c4c54"];

type Cell = { x: number; y: number; z: number; floor: number };

/**
 * Объём здания: два нижних этажа 12 × 2, выше этажи 10 × 2. Ячеек в объёме больше, чем страниц:
 * пустые остаются чертежом, это место для новых страниц по шаблону.
 */
function envelope(total: number): Cell[] {
  const cells: Cell[] = [];
  let floor = 0;
  while (cells.length < total) {
    const w = floor < 2 ? 12 : 10;
    for (let z = 0; z < 2; z++)
      for (let x = 0; x < w; x++) cells.push({ x: (x - (w - 1) / 2) * STEP_XZ, y: floor * STEP_Y, z: (0.5 - z) * STEP_XZ, floor });
    floor++;
  }
  return cells;
}

/** Рёбра всех ячеек одной геометрией, этаж за этажом: рост drawRange рисует чертёж линия за линией */
/**
 * Порядок застройки: пары на фасаде одна над другой, снизу 12 страниц проектирования,
 * над каждой её парная страница разрешения. Остальные кластеры занимают ячейки по порядку.
 */
function slots(cells: Cell[], pairs: number) {
  const front = (f: number) => cells.map((c, i) => (c.floor === f && c.z > 0 ? i : -1)).filter((i) => i >= 0);
  const first = [...front(0).slice(0, pairs), ...front(1).slice(0, pairs)];
  return [...first, ...cells.map((_, i) => i).filter((i) => !first.includes(i))];
}

function wireGeometry(cells: Cell[]) {
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(S, HT, S));
  const base = edges.attributes.position.array as Float32Array;
  const out = new Float32Array(base.length * cells.length);
  cells.forEach((c, i) => {
    for (let k = 0; k < base.length; k += 3) {
      out[i * base.length + k] = base[k] + c.x;
      out[i * base.length + k + 1] = base[k + 1] + c.y + HT / 2;
      out[i * base.length + k + 2] = base[k + 2] + c.z;
    }
  });
  edges.dispose();
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(out, 3));
  return { geo: g, perCell: base.length / 3 };
}

/** Миллиметровка под зданием: сетка, которая проступает первой */
function gridGeometry() {
  const pts: number[] = [];
  const half = 3.6;
  const step = STEP_XZ / 2;
  for (let v = -half; v <= half + 1e-6; v += step) {
    pts.push(v, 0, -half * 0.5, v, 0, half * 0.5);
  }
  for (let v = -half * 0.5; v <= half * 0.5 + 1e-6; v += step) pts.push(-half, 0, v, half, 0, v);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

function Building({ counts, still }: { counts: number[]; still: boolean }) {
  const total = counts.reduce((a, b) => a + b, 0);
  const group = useRef<THREE.Group>(null);
  const blocks = useRef<THREE.InstancedMesh>(null);
  const wire = useRef<THREE.LineSegments>(null);
  const grid = useRef<THREE.LineSegments>(null);
  const smooth = useRef({ p: still ? 1 : 0, px: 0 });
  const pointer = useRef(0);
  const { size } = useThree();

  useEffect(() => {
    const move = (e: PointerEvent) => void (pointer.current = (e.clientX / window.innerWidth) * 2 - 1);
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  const data = useMemo(() => {
    const cells = envelope(total);
    const owner = counts.flatMap((n, ci) => Array.from({ length: n }, () => ci));
    // Номер страницы внутри своего кластера: блоки кластера растут по очереди
    const order = owner.map((ci, i) => i - owner.indexOf(ci));
    return { cells, owner, order, slot: slots(cells, counts[0]), wire: wireGeometry(cells), grid: gridGeometry(), box: new THREE.BoxGeometry(S, HT, S) };
  }, [counts, total]);

  useEffect(
    () => () => {
      data.wire.geo.dispose();
      data.grid.dispose();
      data.box.dispose();
    },
    [data],
  );

  // Цвета блоков задаются один раз
  useEffect(() => {
    const m = blocks.current;
    if (!m) return;
    const c = new THREE.Color();
    data.owner.forEach((ci, i) => m.setColorAt(i, c.set(COLORS[ci])));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [data]);

  const obj = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
    const s = smooth.current;
    const dt = Math.min(delta, 1 / 20);
    s.p = still ? 1 : damp(s.p, buildState.progress, 6, dt);
    s.px = damp(s.px, pointer.current, 2.5, dt);
    const p = s.p;
    const t = still ? 0 : state.clock.elapsedTime;

    const g = group.current;
    if (g) {
      const narrow = size.width < 520;
      g.scale.setScalar(narrow ? 0.78 : 1);
      // Медленный облёт: чертёж смотрим почти сверху, готовое здание сбоку
      g.rotation.y = -0.8 + smoothstep(p, 0, 1) * 0.42 + s.px * 0.12 + Math.sin(t * 0.25) * 0.02;
      g.rotation.x = 0.5 - smoothstep(p, 0.1, 0.7) * 0.3;
      g.position.set(-0.25, -0.75 - smoothstep(p, 0.1, 0.8) * 0.2, 0);
    }

    // 1. Сетка и чертёж: линии этажей прорисовываются снизу вверх
    const draw = smoothstep(p, 0.02, buildState.drawEnd);
    if (grid.current) (grid.current.material as THREE.LineBasicMaterial).opacity = 0.08 + 0.1 * smoothstep(p, 0, 0.06);
    if (wire.current) {
      wire.current.geometry.setDrawRange(0, Math.floor(draw * data.cells.length) * data.wire.perCell);
      // Когда объём застроен, чертёж уходит в тонкую разметку
      (wire.current.material as THREE.LineBasicMaterial).opacity = 0.55 - smoothstep(p, 0.6, 1) * 0.3;
    }

    // 2. Блоки: каждый кластер в своём окне, страницы кластера по очереди вырастают из перекрытия
    const m = blocks.current;
    if (!m) return;
    const pulse = smoothstep(p, buildState.pairAt, 1);
    data.owner.forEach((ci, i) => {
      const cell = data.cells[data.slot[i]];
      const [a, b] = buildState.windows[ci] ?? [0, 1];
      const local = counts[ci] > 1 ? data.order[i] / (counts[ci] - 1) : 0;
      const start = a + (b - a) * local * 0.7;
      const k = still ? 1 : easeOut(clamp((p - start) / ((b - a) * 0.3 + 0.001), 0, 1));
      // Пары в финале приподнимаются волной: проектирование и разрешение рядом
      const wave = clamp(pulse * 2.4 - (cell.x / STEP_XZ + 6) / 12, 0, 1);
      const lift = ci < 2 ? Math.sin(wave * Math.PI) * 0.07 : 0;
      obj.position.set(cell.x, cell.y + (HT * k) / 2, cell.z + lift);
      // Не начатый блок прячем целиком, иначе сплющенная крышка видна на чертеже
      obj.scale.setScalar(k < 0.002 ? 0 : 1);
      obj.scale.y = k < 0.002 ? 0 : k;
      obj.updateMatrix();
      m.setMatrixAt(i, obj.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <lineSegments ref={grid} geometry={data.grid}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0} depthWrite={false} />
      </lineSegments>
      <lineSegments ref={wire} geometry={data.wire.geo}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.55} depthWrite={false} />
      </lineSegments>
      <instancedMesh ref={blocks} args={[data.box, undefined, total]}>
        <meshStandardMaterial roughness={0.55} metalness={0.05} />
      </instancedMesh>
    </group>
  );
}

/** Холст здания сайта */
export default function SiteBuilding({ counts }: { counts: number[] }) {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const io = new IntersectionObserver((es) => setVisible(es[es.length - 1].isIntersecting), { rootMargin: "100px" });
    if (host.current) io.observe(host.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={host} className={styles.host} aria-hidden="true">
      <Canvas
        className={styles.canvas}
        dpr={[1, 1.75]}
        frameloop={visible ? "always" : "never"}
        camera={{ position: [0, 2.8, 9.2], fov: 32, near: 0.1, far: 40 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl, camera }) => {
          gl.setClearColor(0x000000, 0);
          camera.lookAt(0, 0.6, 0);
        }}
      >
        <hemisphereLight args={["#ffffff", "#202024", 1.1]} />
        <directionalLight position={[4, 7, 5]} intensity={1.8} />
        <directionalLight position={[-5, 2, -3]} intensity={0.35} color="#ff4d9d" />
        <Building counts={counts} still={still} />
      </Canvas>
    </div>
  );
}
