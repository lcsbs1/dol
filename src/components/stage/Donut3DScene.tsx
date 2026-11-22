"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { CategorySlice, ExpenseCategorySlug } from "@/lib/finance/types";

interface Donut3DSceneProps {
  slices: CategorySlice[];
  selectedCategory: ExpenseCategorySlug | null;
  highlightedCategory: ExpenseCategorySlug | null;
  onSelectCategory: (slug: ExpenseCategorySlug | null) => void;
  isDark: boolean;
}

interface SliceGeometrySpec {
  slice: CategorySlice;
  geometry: THREE.ExtrudeGeometry;
  midAngle: number;
}

function buildRingSliceGeometry(startAngle: number, endAngle: number): THREE.ExtrudeGeometry {
  const innerRadius = 1.05;
  const outerRadius = 1.88;
  const shape = new THREE.Shape();

  shape.absarc(0, 0, outerRadius, startAngle, endAngle, false);
  shape.lineTo(Math.cos(endAngle) * innerRadius, Math.sin(endAngle) * innerRadius);
  shape.absarc(0, 0, innerRadius, endAngle, startAngle, true);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.055,
    bevelSize: 0.04,
    bevelSegments: 4,
    curveSegments: 36,
  });

  geometry.center();
  // Mantém centrada em Y=0 mas preserva posição radial original calculando offset depois
  geometry.dispose();

  const rawGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.055,
    bevelSize: 0.04,
    bevelSegments: 4,
    curveSegments: 36,
  });
  rawGeo.rotateX(-Math.PI / 2);
  rawGeo.translate(0, -0.21, 0);
  return rawGeo;
}

function DonutSliceMesh({
  spec,
  isSelected,
  isHighlighted,
  onSelect,
  isDark,
}: {
  spec: SliceGeometrySpec;
  isSelected: boolean;
  isHighlighted: boolean;
  onSelect: () => void;
  isDark: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { invalidate } = useThree();
  const active = isSelected || isHighlighted;

  useEffect(() => {
    invalidate();
  }, [active, invalidate, spec.slice.amount_cents]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const targetY = active ? 0.24 : 0;
    const radialOffset = active ? 0.14 : 0;
    const targetX = Math.cos(spec.midAngle) * radialOffset;
    const targetZ = -Math.sin(spec.midAngle) * radialOffset;

    const speed = Math.min(1, delta * 10);
    mesh.position.y = THREE.MathUtils.lerp(mesh.position.y, targetY, speed);
    mesh.position.x = THREE.MathUtils.lerp(mesh.position.x, targetX, speed);
    mesh.position.z = THREE.MathUtils.lerp(mesh.position.z, targetZ, speed);

    if (
      Math.abs(mesh.position.y - targetY) > 0.002 ||
      Math.abs(mesh.position.x - targetX) > 0.002 ||
      Math.abs(mesh.position.z - targetZ) > 0.002
    ) {
      invalidate();
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={spec.geometry}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      <meshStandardMaterial
        color={spec.slice.color}
        roughness={isDark ? 0.34 : 0.28}
        metalness={0.14}
        emissive={active ? spec.slice.color : "#000000"}
        emissiveIntensity={active ? 0.22 : 0}
      />
    </mesh>
  );
}

function EmptyRingMesh({ isDark }: { isDark: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const { invalidate } = useThree();

  useEffect(() => {
    invalidate();
  }, [invalidate]);

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.45, 0.32, 24, 64]} />
      <meshStandardMaterial
        color={isDark ? "#232733" : "#DCE1EC"}
        roughness={0.45}
        metalness={0.1}
        transparent
        opacity={0.75}
      />
    </mesh>
  );
}

export default function Donut3DScene({
  slices,
  selectedCategory,
  highlightedCategory,
  onSelectCategory,
  isDark,
}: Donut3DSceneProps) {
  const specs = useMemo<SliceGeometrySpec[]>(() => {
    const total = slices.reduce((acc, s) => acc + s.amount_cents, 0);
    if (total <= 0) return [];

    const gap = slices.length > 1 ? 0.045 : 0;
    let cursor = Math.PI / 2;

    return slices.map((slice) => {
      const span = Math.max(0.14, (slice.amount_cents / total) * Math.PI * 2);
      const start = cursor + gap / 2;
      const end = cursor + span - gap / 2;
      const midAngle = (start + end) / 2;
      cursor += span;

      return {
        slice,
        geometry: buildRingSliceGeometry(start, end),
        midAngle,
      };
    });
  }, [slices]);

  useEffect(() => {
    return () => {
      for (const spec of specs) {
        spec.geometry.dispose();
      }
    };
  }, [specs]);

  return (
    <Canvas
      dpr={[1, 2]}
      frameloop="demand"
      camera={{ position: [0, 3.6, 3.7], fov: 36 }}
      onPointerMissed={() => onSelectCategory(null)}
    >
      <ambientLight intensity={isDark ? 0.85 : 1.05} />
      <directionalLight position={[4, 7, 5]} intensity={isDark ? 1.55 : 1.35} />
      <directionalLight position={[-4, 3, -4]} intensity={0.55} color="#A5B4FC" />

      <group rotation={[0.08, 0, 0]}>
        {specs.length === 0 ? (
          <EmptyRingMesh isDark={isDark} />
        ) : (
          specs.map((spec) => (
            <DonutSliceMesh
              key={spec.slice.category_slug}
              spec={spec}
              isSelected={selectedCategory === spec.slice.category_slug}
              isHighlighted={highlightedCategory === spec.slice.category_slug}
              onSelect={() =>
                onSelectCategory(
                  selectedCategory === spec.slice.category_slug
                    ? null
                    : spec.slice.category_slug
                )
              }
              isDark={isDark}
            />
          ))
        )}
      </group>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 5}
        maxPolarAngle={Math.PI / 2.25}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
