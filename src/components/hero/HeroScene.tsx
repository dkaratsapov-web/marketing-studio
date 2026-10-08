"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { heroState } from "./heroState";
import {
  dustFragment,
  dustVertex,
  floorFragment,
  monolithFragment,
  monolithVertex,
  planeVertex,
  seamFragment,
} from "./shaders";

const LIME = new THREE.Color("#c4f542");
const PINK = new THREE.Color("#ff4d9d");
const HALF_W = 0.5;
const HEIGHT = 2.6;
const DEPTH = 0.34;
const HALF = new THREE.Vector3(HALF_W / 2, HEIGHT / 2, DEPTH / 2);
const SEAM_SIZE = new THREE.Vector2(6, HEIGHT * 1.02);
const FLOOR_SIZE = new THREE.Vector2(9, 9);
const DUST_COUNT = 560;

const { damp, clamp, smoothstep, lerp } = THREE.MathUtils;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Детерминированный ГПСЧ: одинаковая пыль при каждом рендере. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Uniformed = THREE.Mesh | THREE.Points | null;

function setUniforms(mesh: Uniformed, values: Record<string, number | THREE.Vector3>) {
  if (!mesh) return;
  const { uniforms } = mesh.material as THREE.ShaderMaterial;
  for (const key in values) {
    const v = values[key];
    if (typeof v === "number") uniforms[key].value = v;
    else (uniforms[key].value as THREE.Vector3).copy(v);
  }
}

/**
 * Сценарий по прогрессу скролла p (0..1):
 *   0.00–0.45  монолит разворачивается фронтально, шов расходится
 *   0.45–0.65  пауза: свет льётся, текст «Внутри»
 *   0.65–1.00  монолит встаёт в центр, камера пролетает в щель
 */
function choreography(p: number) {
  const open = 0.1 + 0.9 * smoothstep(p, 0.05, 0.45);
  const dive = easeInOut(clamp((p - 0.62) / 0.38, 0, 1));
  return { open, dive, turn: easeInOut(clamp(p / 0.5, 0, 1)) };
}

function Monolith({ still }: { still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  const seam = useRef<THREE.Mesh>(null);
  const floor = useRef<THREE.Mesh>(null);
  const smooth = useRef({ progress: 0, px: 0, py: 0 });
  const light = useMemo(() => new THREE.Vector3(), []);

  const geometry = useMemo(() => new THREE.BoxGeometry(HALF_W, HEIGHT, DEPTH), []);

  const materials = useMemo(() => {
    const half = (side: number) =>
      new THREE.ShaderMaterial({
        vertexShader: monolithVertex,
        fragmentShader: monolithFragment,
        uniforms: {
          uTime: { value: 0 },
          uOpen: { value: 0 },
          uIgnite: { value: 0 },
          uSide: { value: side },
          uHalf: { value: HALF },
          uLight: { value: new THREE.Vector3(0, 1, 4) },
          uLime: { value: LIME },
          uPink: { value: PINK },
        },
      });
    const additive = {
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    } as const;
    return {
      left: half(-1),
      right: half(1),
      seam: new THREE.ShaderMaterial({
        ...additive,
        depthTest: false,
        vertexShader: planeVertex,
        fragmentShader: seamFragment,
        uniforms: {
          uTime: { value: 0 },
          uOpen: { value: 0 },
          uIgnite: { value: 0 },
          uGap: { value: 0 },
          uSize: { value: SEAM_SIZE },
          uLime: { value: LIME },
          uPink: { value: PINK },
        },
      }),
      floor: new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        vertexShader: planeVertex,
        fragmentShader: floorFragment,
        uniforms: {
          uOpen: { value: 0 },
          uIgnite: { value: 0 },
          uSize: { value: FLOOR_SIZE },
          uLime: { value: LIME },
          uPink: { value: PINK },
        },
      }),
    };
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      Object.values(materials).forEach((m) => m.dispose());
    },
    [geometry, materials],
  );

  useFrame((state, delta) => {
    const s = smooth.current;
    const dt = Math.min(delta, 1 / 20);
    s.progress = damp(s.progress, heroState.progress, 5, dt);
    s.px = damp(s.px, heroState.pointerX, 3, dt);
    s.py = damp(s.py, heroState.pointerY, 3, dt);

    const elapsed = state.clock.elapsedTime;
    const t = still ? 0 : elapsed;
    const intro = still ? 1 : easeOut(clamp((elapsed - 0.15) / 2.6, 0, 1));
    const ignite = still ? 1 : clamp((elapsed - 0.7) / 1.5, 0, 1);

    const p = s.progress;
    const { open: baseOpen, dive, turn } = choreography(p);
    // Лёгкое «дыхание» шва в покое
    const breath = still ? 0 : (Math.sin(t * 1.3) * 0.5 + 0.5) * 0.04 * (1 - smoothstep(p, 0, 0.1));
    const open = baseOpen + breath;
    const gap = open * 0.42 + dive * 0.55;

    left.current?.position.setX(-(HALF_W / 2 + gap / 2));
    right.current?.position.setX(HALF_W / 2 + gap / 2);

    const { viewport, camera } = state;
    const narrow = viewport.aspect < 0.9;
    const sideX = narrow ? 0 : Math.min(viewport.width * 0.22, 2.4);
    const baseX = lerp(sideX, 0, smoothstep(p, 0.55, 0.85));
    const baseY = narrow ? -0.35 : -0.05;
    const scale = narrow ? 0.78 : 1;

    const g = group.current;
    if (g) {
      g.position.set(baseX, lerp(baseY, 0, dive) + Math.sin(t * 0.5) * 0.03, 0);
      g.scale.setScalar(scale);
      // Из три-четверти во фронт, плюс реакция на курсор, которая гаснет к пролёту
      const sway = 1 - dive;
      g.rotation.y = lerp(-0.5, 0, turn) + Math.sin(t * 0.12) * 0.1 * sway + s.px * 0.2 * sway;
      g.rotation.x = 0.04 - s.py * 0.07 * sway;
      g.rotation.z = 0.02 * sway;
    }

    // Фонарь следует за курсором
    light.set(baseX + s.px * 3.2, 1.2 - s.py * 2.2, 3.2);

    const uniforms = { uTime: t, uOpen: open, uIgnite: ignite };
    setUniforms(left.current, { ...uniforms, uLight: light });
    setUniforms(right.current, { ...uniforms, uLight: light });
    setUniforms(seam.current, { ...uniforms, uGap: gap });
    setUniforms(floor.current, { uOpen: open, uIgnite: ignite });

    heroState.seamX = baseX;
    heroState.open = open;

    // Камера: наезд из темноты на загрузке, затем пролёт в щель
    const z = lerp(6.2 + (1 - intro) * 2.4, 0.6, dive);
    camera.position.set(s.px * 0.12 * (1 - dive) + baseX * dive, s.py * 0.08 * (1 - dive), z);
    camera.lookAt(lerp(narrow ? 0 : baseX * 0.35, baseX, dive), 0, 0);
  });

  return (
    <group ref={group}>
      <mesh ref={left} geometry={geometry} material={materials.left} />
      <mesh ref={right} geometry={geometry} material={materials.right} />
      <mesh
        ref={seam}
        position={[0, 0, DEPTH / 2 + 0.02]}
        material={materials.seam}
        renderOrder={2}
      >
        <planeGeometry args={[SEAM_SIZE.x, SEAM_SIZE.y]} />
      </mesh>
      <mesh
        ref={floor}
        position={[0, -HEIGHT / 2 - 0.002, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={materials.floor}
        renderOrder={1}
      >
        <planeGeometry args={[FLOOR_SIZE.x, FLOOR_SIZE.y]} />
      </mesh>
    </group>
  );
}

function Dust({ still }: { still: boolean }) {
  const { gl } = useThree();
  const points = useRef<THREE.Points>(null);
  const seam = useMemo(() => new THREE.Vector3(), []);

  const [geometry, material] = useMemo(() => {
    const positions = new Float32Array(DUST_COUNT * 3);
    const seeds = new Float32Array(DUST_COUNT);
    const random = mulberry32(7);
    for (let i = 0; i < DUST_COUNT; i++) {
      positions[i * 3] = (random() - 0.5) * 12;
      positions[i * 3 + 1] = (random() - 0.5) * 8;
      positions[i * 3 + 2] = (random() - 0.5) * 6 - 0.5;
      seeds[i] = random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const m = new THREE.ShaderMaterial({
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpen: { value: 0 },
        uSeam: { value: new THREE.Vector3() },
        uPixelRatio: { value: gl.getPixelRatio() },
        uLime: { value: LIME },
        uPink: { value: PINK },
      },
    });
    return [g, m];
  }, [gl]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state) => {
    seam.set(heroState.seamX, 0, 0);
    setUniforms(points.current, {
      uTime: still ? 0 : state.clock.elapsedTime,
      uOpen: heroState.open,
      uSeam: seam,
    });
  });

  return <points ref={points} geometry={geometry} material={material} />;
}

export default function HeroScene() {
  const host = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  // Компонент рендерится только на клиенте (ssr: false), window доступен
  const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: "100px",
    });
    if (host.current) io.observe(host.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={host} style={{ position: "absolute", inset: 0 }}>
      <Canvas
        dpr={[1, 1.75]}
        frameloop={visible ? "always" : "never"}
        camera={{ position: [0, 0, 8.6], fov: 32, near: 0.05, far: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        aria-hidden="true"
      >
        <Monolith still={still} />
        <Dust still={still} />
      </Canvas>
    </div>
  );
}
