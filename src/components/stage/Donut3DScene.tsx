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
  const innerRadius = 1.12;
  const outerRadius = 1.86;
  const shape = new THREE.Shape();

  shape.absarc(0, 0, outerRadius, startAngle, endAngle, false);
  shape.lineTo(Math.cos(endAngle) * innerRadius, Math.sin(endAngle) * innerRadius);
  shape.absarc(0, 0, innerRadius, endAngle, startAngle, true);
  shape.closePath();

  const rawGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.36,
    bevelEnabled: true,
    bevelThickness: 0.045,
    bevelSize: 0.032,
    bevelSegments: 4,
    curveSegments: 40,
  });
  rawGeo.rotateX(-Math.PI / 2);
  rawGeo.translate(0, -0.18, 0);
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
        roughness={isDark ? 0.42 : 0.36}
        metalness={0.05}
        emissive={active ? spec.slice.color : "#000000"}
        emissiveIntensity={active ? 0.2 : 0}
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
      <torusGeometry args={[1.48, 0.32, 24, 64]} />
      <meshStandardMaterial
        color={isDark ? "#252834" : "#DFE2EE"}
        roughness={0.48}
        metalness={0.05}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
}

function ResponsiveDonutGroup({
  specs,
  selectedCategory,
  highlightedCategory,
  onSelectCategory,
  isDark,
}: {
  specs: SliceGeometrySpec[];
  selectedCategory: ExpenseCategorySlug | null;
  highlightedCategory: ExpenseCategorySlug | null;
  onSelectCategory: (slug: ExpenseCategorySlug | null) => void;
  isDark: boolean;
}) {
  const { viewport, invalidate } = useThree();
  const donutSpan = 4.15;
  const fitWidth = (viewport.width * 0.86) / donutSpan;
  const fitHeight = (viewport.height * 0.9) / (donutSpan * 0.84);
  const scale = Math.max(0.35, Math.min(1.02, fitWidth, fitHeight));

  useEffect(() => {
    invalidate();
  }, [scale, invalidate]);

  return (
    <group rotation={[0.04, 0, 0]} scale={[scale, scale, scale]}>
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
      camera={{ position: [0, 4.8, 2.35], fov: 34 }}
      onPointerMissed={() => onSelectCategory(null)}
    >
      <ambientLight intensity={isDark ? 1.05 : 1.15} />
      <directionalLight position={[4, 8, 4]} intensity={isDark ? 1.25 : 1.1} color="#FFFDF5" />
      <directionalLight position={[-4, 4, -3]} intensity={0.55} color="#D5C2FA" />

      <ResponsiveDonutGroup
        specs={specs}
        selectedCategory={selectedCategory}
        highlightedCategory={highlightedCategory}
        onSelectCategory={onSelectCategory}
        isDark={isDark}
      />

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.6}
        enableDamping
        dampingFactor={0.08}
      />
    </Canvas>
  );
}
