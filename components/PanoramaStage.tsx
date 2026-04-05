import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, Html, useProgress } from '@react-three/drei';
import * as THREE from 'three';

interface PanoramaStageProps {
  imageSrc: string;
  screenshotTrigger: number;
  resetTrigger: number;
}

const PanoramaSphere: React.FC<{ imageSrc: string }> = ({ imageSrc }) => {
  const { gl } = useThree();
  const texture = useLoader(THREE.TextureLoader, imageSrc);

  useEffect(() => {
    // 1. 色彩空间：确保照片颜色准确（SRGB）
    texture.colorSpace = THREE.SRGBColorSpace;
    
    // 2. 极致清晰度设置：开启各向异性过滤 (Anisotropy)
    // 这需要开启 Mipmaps，虽然 LinearFilter (无Mipmap) 看起来锐利，但在倾斜角度下会有锯齿且远处会闪烁。
    // 使用 Max Anisotropy 配合 Mipmap 是工业界标准的“最高画质”方案，既保持了平滑，又保留了倾斜面的细节。
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    // 获取显卡支持的最大各向异性过滤等级 (通常是 16x)
    const maxAnisotropy = gl.capabilities.getMaxAnisotropy();
    texture.anisotropy = maxAnisotropy;
    
    texture.needsUpdate = true;
  }, [texture, gl]);

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial 
        map={texture} 
        side={THREE.DoubleSide} 
        toneMapped={false} 
      />
    </mesh>
  );
};

const ScreenshotHandler: React.FC<{ trigger: number }> = ({ trigger }) => {
  const { gl, scene, camera } = useThree();
  const prevTrigger = useRef(0);

  useEffect(() => {
    if (trigger > 0 && trigger !== prevTrigger.current) {
      prevTrigger.current = trigger;
      gl.render(scene, camera);
      const dataUrl = gl.domElement.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.setAttribute('download', `全景截图-${timestamp}.png`);
      link.setAttribute('href', dataUrl);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [trigger, gl, scene, camera]);

  return null;
};

// 鼠标滚轮缩放控制
const FovZoomHandler = () => {
  const { camera, gl } = useThree();

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (camera instanceof THREE.PerspectiveCamera) {
        const zoomSpeed = 0.05;
        const minFov = 30;
        const maxFov = 110;
        let newFov = camera.fov + e.deltaY * zoomSpeed;
        newFov = Math.max(minFov, Math.min(maxFov, newFov));
        camera.fov = newFov;
        camera.updateProjectionMatrix();
      }
    };
    const canvas = gl.domElement;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [camera, gl]);

  return null;
};

// 视角重置控制器
const ViewManager: React.FC<{ trigger: number; controlsRef: React.RefObject<any> }> = ({ trigger, controlsRef }) => {
  const { camera } = useThree();
  const prevTrigger = useRef(0);

  useEffect(() => {
    if (trigger > 0 && trigger !== prevTrigger.current) {
      prevTrigger.current = trigger;
      
      // 1. 重置相机 FOV
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = 75;
        camera.updateProjectionMatrix();
      }

      // 2. 重置控制器角度
      if (controlsRef.current) {
        controlsRef.current.reset();
      }
    }
  }, [trigger, camera, controlsRef]);

  return null;
};

const Loader = () => {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-white font-mono text-sm">{progress.toFixed(0)}% 已加载</div>
      </div>
    </Html>
  );
};

const PanoramaStage: React.FC<PanoramaStageProps> = ({ imageSrc, screenshotTrigger, resetTrigger }) => {
  const controlsRef = useRef<any>(null);

  return (
    <Canvas
      camera={{ position: [0, 0, 0.1], fov: 75 }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      dpr={[1, 2]}
      className="w-full h-full bg-gray-900 cursor-move"
    >
      <Suspense fallback={<Loader />}>
        <PanoramaSphere imageSrc={imageSrc} />
        <ScreenshotHandler trigger={screenshotTrigger} />
      </Suspense>
      
      <FovZoomHandler />
      <ViewManager trigger={resetTrigger} controlsRef={controlsRef} />
      
      <OrbitControls 
        ref={controlsRef}
        enableZoom={false}
        enablePan={false} 
        enableDamping={true} 
        dampingFactor={0.05}
        rotateSpeed={-0.5}
      />
    </Canvas>
  );
};

export default PanoramaStage;