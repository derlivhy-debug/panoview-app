import * as THREE from 'three';

/**
 * 从等距柱状全景图生成 2x2 场景概览。
 *
 * 这里按“截图”的思路处理：用正常视场的透视投影分别朝四个方向渲染。
 * 横向保留少量重叠来避免漏场景，上下允许缺失，从而避免超广角畸变。
 */
export function generatePanoramaGrid(imageSrc: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const W = img.naturalWidth;
        const cellW = Math.max(1, Math.min(Math.floor(W / 4), MAX_CELL_WIDTH));
        const cellH = Math.max(1, Math.round(cellW / CELL_ASPECT));

        const gap = Math.max(8, Math.round(cellW / 80));
        const gridW = cellW * 2 + gap;
        const gridH = cellH * 2 + gap;

        const canvas = document.createElement('canvas');
        canvas.width = gridW;
        canvas.height = gridH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, gridW, gridH);

        const renderer = createScreenshotRenderer(img, cellW, cellH);

        try {
          for (const dir of DIRECTIONS) {
            const dx = dir.col * (cellW + gap);
            const dy = dir.row * (cellH + gap);

            renderer.render(dir.yaw);
            ctx.drawImage(renderer.canvas, dx, dy, cellW, cellH);
            drawLabel(ctx, dir.label, dx, dy, cellW);
          }
        } finally {
          renderer.dispose();
        }

        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    };

    img.onerror = () => reject(new Error('Image load failed'));
    img.src = imageSrc;
  });
}

/**
 * 弹出系统"另存为"对话框，让用户选择保存位置
 */
export async function saveImage(dataUrl: string, filename: string): Promise<void> {
  // data URL -> Blob
  const res = await fetch(dataUrl);
  const blob = await res.blob();

  // 优先使用 File System Access API（弹出另存为对话框）
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'PNG 图片',
            accept: { 'image/png': ['.png'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (e: any) {
      // 用户取消了对话框
      if (e.name === 'AbortError') return;
      throw e;
    }
  }

  // 回退：传统 <a> 下载
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 200);
}

const CELL_ASPECT = 16 / 9;
const MAX_CELL_WIDTH = 2560;
const SCREENSHOT_VERTICAL_FOV_DEG = 68;

const DIRECTIONS = [
  { label: '北', yaw: 0, row: 0, col: 0 },
  { label: '东', yaw: Math.PI / 2, row: 0, col: 1 },
  { label: '南', yaw: Math.PI, row: 1, col: 0 },
  { label: '西', yaw: -Math.PI / 2, row: 1, col: 1 },
] as const;

function createScreenshotRenderer(
  img: HTMLImageElement,
  width: number,
  height: number,
) {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });

  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x0a0a0a, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const texture = new THREE.Texture(img);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.needsUpdate = true;

  const uniforms = {
    panoMap: { value: texture },
    yaw: { value: 0 },
    verticalFov: { value: THREE.MathUtils.degToRad(SCREENSHOT_VERTICAL_FOV_DEG) },
    aspect: { value: CELL_ASPECT },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;

      uniform sampler2D panoMap;
      uniform float yaw;
      uniform float verticalFov;
      uniform float aspect;
      varying vec2 vUv;

      const float PI = 3.1415926535897932384626433832795;

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float tanHalfFov = tan(verticalFov * 0.5);

        vec3 dir = normalize(vec3(
          p.x * aspect * tanHalfFov,
          p.y * tanHalfFov,
          -1.0
        ));

        float sy = sin(yaw);
        float cy = cos(yaw);
        vec3 worldDir = vec3(
          dir.x * cy - dir.z * sy,
          dir.y,
          dir.x * sy + dir.z * cy
        );

        float u = 0.5 + atan(worldDir.x, -worldDir.z) / (2.0 * PI);
        float v = 0.5 - asin(clamp(worldDir.y, -1.0, 1.0)) / PI;

        gl_FragColor = texture2D(panoMap, vec2(fract(u), v));
      }
    `,
    depthTest: false,
    depthWrite: false,
  });

  const scene = new THREE.Scene();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  scene.add(mesh);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  return {
    canvas,
    render(yaw: number) {
      uniforms.yaw.value = yaw;
      renderer.render(scene, camera);
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
    },
  };
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  cellX: number,
  cellY: number,
  cellW: number,
) {
  const fontSize = Math.max(14, Math.floor(cellW / 35));
  const px = fontSize * 0.7;
  const py = fontSize * 0.35;
  const x = cellX + fontSize * 0.5;
  const y = cellY + fontSize * 0.5;

  ctx.font = `600 ${fontSize}px "Inter", "Segoe UI", sans-serif`;
  const tw = ctx.measureText(text).width;
  const bgW = tw + px * 2;
  const bgH = fontSize + py * 2;
  const r = fontSize / 4;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.roundRect(x, y, bgW, bgH, r);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, x + bgW / 2, y + bgH / 2);
}
