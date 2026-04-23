import { useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Center, Environment } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

interface ModelViewerProps {
  modelUrl: string;
  autoRotate?: boolean;
}

function Model({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!gltf.scene) return;
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = 2.5 / maxDim;
      gltf.scene.scale.setScalar(scale);
    }
    const center = box.getCenter(new THREE.Vector3());
    gltf.scene.position.sub(center.multiplyScalar(gltf.scene.scale.x));
  }, [gltf]);

  return (
    <group ref={groupRef}>
      <primitive object={gltf.scene} />
    </group>
  );
}

function LoadingSpinner() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 2;
  });
  return (
    <mesh ref={ref}>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#6366f1" wireframe />
    </mesh>
  );
}

export function ModelViewer({ modelUrl, autoRotate = true }: ModelViewerProps) {
  return (
    <div className="w-full h-full" style={{ minHeight: 400 }}>
      <Canvas
        camera={{ position: [0, 1.5, 4], fov: 50 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
      >
        <color attach="background" args={["#f5f5f5"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.5} castShadow />
        <directionalLight position={[-4, 3, -2]} intensity={0.5} />
        <directionalLight position={[0, -3, 5]} intensity={0.3} />
        <Suspense fallback={<LoadingSpinner />}>
          <Center>
            <Model url={modelUrl} />
          </Center>
        </Suspense>
        <OrbitControls
          autoRotate={autoRotate}
          autoRotateSpeed={2}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={1}
          maxDistance={15}
        />
      </Canvas>
    </div>
  );
}
