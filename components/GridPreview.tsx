import React, { useEffect, useCallback } from 'react';
import { Download, X } from 'lucide-react';
import { saveImage } from '../utils/panoramaGrid';

interface GridPreviewProps {
  src: string;
  onClose: () => void;
}

const GridPreview: React.FC<GridPreviewProps> = ({ src, onClose }) => {

  // ESC 关闭
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    // 锁定背景滚动
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const handleDownload = async () => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    await saveImage(src, `panoview-grid-${ts}.png`);
  };

  // 点击遮罩区域关闭（不点击图片区域）
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={handleBackdropClick}
    >
      {/* 顶部工具栏 */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-10">
        <div className="text-sm text-white/60 font-mono">
          场景概览 · 四方向 16:9
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-medium transition-all active:scale-95 shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span>保存图片</span>
          </button>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="关闭 (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 预览图 */}
      <img
        src={src}
        alt="场景概览四宫格"
        className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/10"
        draggable={false}
      />

      {/* 底部提示 */}
      <p className="mt-4 text-xs text-gray-500 font-mono">
        点击「保存图片」下载 · 按 ESC 或点击空白处关闭
      </p>
    </div>
  );
};

export default GridPreview;
