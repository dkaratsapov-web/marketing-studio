"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { heroState } from "./heroState";
import {
  dustFragment,
  dustVertex,
  monolithFragment,
  monolithVertex,
  seamFragment,
  seamVertex,
} from "./shaders";

const SIGNAL = new THREE.Color("#f0a03c");
const HALF_W = 0.5;
const HEIGHT = 2.6;
const DEPTH = 0.34;
const DUST_COUNT = 520;

const damp = THREE.MathUtils.damp;

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

function setUniforms(mesh: THREE.Mesh | THREE.Points | null, values: Record<string, number>) {
  if (!mesh) return;
  const { uniforms } = mesh.material as THREE.ShaderMaterial;
  for (const key in values) uniforms[key].value = values[key];
}

function Monolith({ still }: { still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  const seam = useRef<THREE.Mesh>(null);
  const smooth = useRef({ progress: 0, px: 0, py: 0 });

  const geometry = useMemo(() => new THREE.BoxGeometry(HALF_W, HEIGHT, DEPTH, 1, 1, 1), []);

  const [leftMat, rightMat, seamMat] = useMemo(() => {
    const make = (side: number) =>
      new THREE.ShaderMaterial({
        vertexShader: monolithVertex,
        fragmentShader: monolithFragment,
        uniforms: {
          uTime: { value: 0 },
          uOpen: { value: 0 },
          uSide: { value: side },
          uSignal: { value: SIGNAL },
        },
      });
    const seamMaterial = new THREE.ShaderMaterial({
      vertexShader: seamVertex,
      fragmentShader: seamFragment,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpen: { value: 0 },
        uSignal: { value: SIGNAL },
      },
    });
    return [make(-1), make(1), seamMaterial];
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      leftMat.dispose();
      rightMat.dispose();
      seamMat.dispose();
    },
    [geometry, leftMat, rightMat, seamMat],
  );

  useFrame((state, delta) => {
    const s = smooth.current;
    const dt = Math.min(delta, 1 / 20);
    s.progress = damp(s.progress, heroState.progress, 6, dt);
    s.px = damp(s.px, heroState.pointerX, 3, dt);
    s.py = damp(s.py, heroState.pointerY, 3, dt);

    const t = still ? 0 : state.clock.elapsedTime;
    const p = s.progress;

    // Шов приоткрыт всегда, как в знаке. Полностью раскрывается к середине скролла.
    const open = 0.1 + 0.9 * THREE.MathUtils.smoothstep(p, 0.05, 0.65);
    const gap = open * 0.42;

    if (left.current && right.current && seam.current) {
      left.current.position.x = -(HALF_W / 2 + gap / 2);
      right.current.position.x = HALF_W / 2 + gap / 2;
      seam.current.scale.x = 0.35 + gap * 2.4;
    }

    for (const mesh of [left.current, right.current, seam.current]) {
      setUniforms(mesh, { uTime: t, uOpen: open });
    }

    // Композиция: справа на широких экранах, по центру за текстом на узких
    const { viewport, camera } = state;
    const narrow = viewport.aspect < 0.9;
    const baseX = narrow ? 0 : Math.min(viewport.width * 0.22, 2.2);
    const baseY = narrow ? -0.35 : 0;
    const scale = narrow ? 0.78 : 1;

    const g = group.current;
    if (g) {
      g.position.x = baseX;
      g.position.y = baseY - 0.05 + p * 0.1 + Math.sin(t * 0.5) * 0.03;
      g.scale.setScalar(scale * (1 + p * 0.08));
      g.rotation.y = -0.45 + Math.sin(t * 0.12) * 0.12 + s.px * 0.22 + p * 0.9;
      g.rotation.x = 0.04 - s.py * 0.08;
      g.rotation.z = 0.02 + p * -0.05;
    }

    camera.position.z = 6.2 - p * 0.6;
    camera.position.x = s.px * 0.12;
    camera.position.y = s.py * 0.08;
    camera.lookAt(narrow ? 0 : baseX * 0.35, 0, 0);
  });

  return (
    <group ref={group}>
      <mesh ref={left} geometry={geometry} material={leftMat} />
      <mesh ref={right} geometry={geometry} material={rightMat} />
      <mesh ref={seam} position={[0, 0, DEPTH / 2 + 0.02]} material={seamMat} renderOrder={2}>
        <planeGeometry args={[1, HEIGHT * 1.02]} />
      </mesh>
    </group>
  );
}

function Dust({ still }: { still: boolean }) {
  const { gl } = useThree();
  const points = useRef<THREE.Points>(null);

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
        uPixelRatio: { value: gl.getPixelRatio() },
        uSignal: { value: SIGNAL },
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
    setUniforms(points.current, {
      uTime: still ? 0 : state.clock.elapsedTime,
      uOpen: THREE.MathUtils.smoothstep(heroState.progress, 0.05, 0.65),
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
        camera={{ position: [0, 0, 6.2], fov: 32, near: 0.1, far: 40 }}
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
