/**
 * 从等距柱状投影全景图裁切四个方向（每方向 90°）的 16:9 画面，
 * 拼成 2×2 四宫格，返回 data URL 供预览。
 *
 * 裁切策略：水平四等分，垂直居中（赤道附近），零重采样。
 */
export function generatePanoramaGrid(imageSrc: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const W = img.naturalWidth;
        const H = img.naturalHeight;

        // 每方向裁切宽度（90° = W/4 像素）
        const cropW = Math.floor(W / 4);
        // 16:9 画幅高度
        const cropH = Math.floor(cropW * 9 / 16);
        // 垂直居中，防溢出
        const finalH = Math.min(cropH, H);
        const cropY = Math.floor((H - finalH) / 2);

        // 间隔线粗细（按图宽自适应，最小 8px）
        const gap = Math.max(8, Math.round(cropW / 80));

        // 四宫格画布尺寸
        const gridW = cropW * 2 + gap;
        const gridH = finalH * 2 + gap;

        const canvas = document.createElement('canvas');
        canvas.width = gridW;
        canvas.height = gridH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');

        // 黑底
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, gridW, gridH);

        // 四个方向：以标准等距柱状投影约定，图片中心 = 0°（北）
        // 北(0°) 中心 x=W/2, 东(90°) x=3W/4, 南(180°) x=0/W, 西(270°) x=W/4
        const halfW = Math.floor(cropW / 2);
        const directions = [
          { label: '北', cx: Math.floor(W / 2),     row: 0, col: 0 },
          { label: '东', cx: Math.floor(3 * W / 4), row: 0, col: 1 },
          { label: '南', cx: 0,                      row: 1, col: 0 }, // 跨边界
          { label: '西', cx: Math.floor(W / 4),     row: 1, col: 1 },
        ];

        for (const dir of directions) {
          const dx = dir.col * (cropW + gap);
          const dy = dir.row * (finalH + gap);

          // 裁切起点（可能为负数 → 跨边界）
          let startX = dir.cx - halfW;

          if (startX >= 0 && startX + cropW <= W) {
            // 正常：不跨边界
            ctx.drawImage(img, startX, cropY, cropW, finalH, dx, dy, cropW, finalH);
          } else if (startX < 0) {
            // 跨左边界：右端补到左端
            const overflow = -startX;
            ctx.drawImage(img, W - overflow, cropY, overflow, finalH, dx, dy, overflow, finalH);
            ctx.drawImage(img, 0, cropY, cropW - overflow, finalH, dx + overflow, dy, cropW - overflow, finalH);
          } else {
            // 跨右边界
            const leftPart = W - startX;
            ctx.drawImage(img, startX, cropY, leftPart, finalH, dx, dy, leftPart, finalH);
            ctx.drawImage(img, 0, cropY, cropW - leftPart, finalH, dx + leftPart, dy, cropW - leftPart, finalH);
          }

          drawLabel(ctx, dir.label, dx, dy, cropW);
        }

        // 返回 data URL 供预览
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
  // data URL → Blob
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

// ─── helpers ───

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
