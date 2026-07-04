'use client';

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, RoundedBox } from '@react-three/drei';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Group } from 'three';
import ExifTag from './ExifTag';

gsap.registerPlugin(ScrollTrigger);

/**
 * The instrument. A medium-format camera built from primitives, matte black
 * with the red detail ring, rotating a full turn as this section scrolls by.
 *
 * Swapping in a real GLB later: replace <CameraModel /> with
 *   const { scene } = useGLTF('/models/camera.glb'); <primitive object={scene} />
 * and keep the same group ref. A photoreal mesh can also be generated from a
 * product still of the camera through Higgsfield's image-to-3D.
 */

function CameraModel({ progress }: { progress: React.MutableRefObject<number> }) {
  const group = useRef<Group>(null);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const target = progress.current * Math.PI * 2 - Math.PI * 0.25;
    g.rotation.y += (target - g.rotation.y) * 0.08;
    g.rotation.x = -0.12 + progress.current * 0.2;
  });

  const body = '#1c1916';
  const grip = '#26221d';

  return (
    <Float speed={1.2} rotationIntensity={0.08} floatIntensity={0.35}>
      <group ref={group} scale={1.35}>
        {/* Body */}
        <RoundedBox args={[2.1, 1.35, 1.0]} radius={0.09}>
          <meshStandardMaterial color={body} roughness={0.55} metalness={0.35} />
        </RoundedBox>
        {/* Grip */}
        <RoundedBox args={[0.55, 1.35, 1.05]} radius={0.12} position={[1.15, 0, 0]}>
          <meshStandardMaterial color={grip} roughness={0.9} metalness={0.05} />
        </RoundedBox>
        {/* Viewfinder */}
        <RoundedBox args={[0.9, 0.42, 0.55]} radius={0.06} position={[-0.35, 0.85, -0.05]}>
          <meshStandardMaterial color={body} roughness={0.6} metalness={0.3} />
        </RoundedBox>
        {/* Lens barrel */}
        <mesh position={[-0.2, 0, 0.85]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.52, 0.56, 0.75, 48]} />
          <meshStandardMaterial color={'#14110e'} roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Red detail ring, the Hasselblad nod */}
        <mesh position={[-0.2, 0, 1.18]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.5, 0.028, 16, 64]} />
          <meshStandardMaterial color={'#a4291f'} roughness={0.35} metalness={0.4} />
        </mesh>
        {/* Front glass */}
        <mesh position={[-0.2, 0, 1.24]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.06, 48]} />
          <meshStandardMaterial color={'#2a2f3a'} roughness={0.08} metalness={0.9} />
        </mesh>
        {/* Shutter button */}
        <mesh position={[1.15, 0.74, 0.28]}>
          <cylinderGeometry args={[0.09, 0.09, 0.08, 24]} />
          <meshStandardMaterial color={'#c47a2e'} roughness={0.35} metalness={0.5} />
        </mesh>
      </group>
    </Float>
  );
}

export default function CameraRig3D() {
  const sectionRef = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReduced(true);
      return;
    }
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        progress.current = self.progress;
      },
    });
    return () => st.kill();
  }, []);

  return (
    <section ref={sectionRef} className="relative border-y border-line">
      <div className="grid min-h-[80svh] items-center gap-8 px-[var(--gutter)] py-[var(--space-section)] md:grid-cols-[1fr_1.2fr]">
        <div>
          <ExifTag>The instrument</ExifTag>
          <h2 className="display display-section mt-4">
            Medium format.
            <br />
            No shortcuts.
          </h2>
          <p className="mt-5 max-w-md text-muted">
            The studio runs on Hasselblad glass, Profoto light and a habit of planning every frame
            before the first exposure. Turn it over: scroll.
          </p>
        </div>
        <div className="h-[52svh] md:h-[64svh]">
          {!reduced ? (
            <Canvas dpr={[1, 1.75]} camera={{ position: [0, 0.4, 5.2], fov: 38 }} gl={{ antialias: true, alpha: true }}>
              <ambientLight intensity={0.25} />
              <pointLight position={[4, 3, 4]} intensity={55} color={'#f0b264'} />
              <pointLight position={[-5, -2, 2]} intensity={18} color={'#7a5a3a'} />
              <CameraModel progress={progress} />
            </Canvas>
          ) : (
            <div className="grid h-full place-items-center border border-line bg-raise">
              <span className="exif">Hasselblad H <b>·</b> 90MM <b>·</b> F/2.8</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
