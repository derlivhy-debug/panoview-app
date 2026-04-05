import React, { useState, useCallback } from 'react';
import { 
  Aperture, 
  Download, 
  X, 
  RotateCcw, 
  Maximize2, 
  Monitor, 
  Sparkles,
  LayoutGrid,
  Loader2
} from 'lucide-react';
import PanoramaStage from './components/PanoramaStage';
import FileUploader from './components/FileUploader';
import GridPreview from './components/GridPreview';
import { ViewerState } from './types';
import { generatePanoramaGrid } from './utils/panoramaGrid';

const App: React.FC = () => {
  const [viewerState, setViewerState] = useState<ViewerState>({
    imageSrc: null,
    fileName: null,
    isDragging: false,
  });

  const [triggerScreenshot, setTriggerScreenshot] = useState<number>(0);
  const [triggerReset, setTriggerReset] = useState<number>(0);
  const [isGeneratingGrid, setIsGeneratingGrid] = useState(false);
  const [gridPreviewSrc, setGridPreviewSrc] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setViewerState(prev => ({
          ...prev,
          imageSrc: e.target!.result as string,
          fileName: file.name
        }));
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleClear = useCallback(() => {
    setViewerState({
      imageSrc: null,
      fileName: null,
      isDragging: false
    });
  }, []);

  const handleScreenshotRequest = useCallback(() => {
    setTriggerScreenshot(prev => prev + 1);
  }, []);

  const handleResetView = useCallback(() => {
    setTriggerReset(prev => prev + 1);
  }, []);

  const handleGridExport = useCallback(async () => {
    if (!viewerState.imageSrc || isGeneratingGrid) return;
    setIsGeneratingGrid(true);
    try {
      const dataUrl = await generatePanoramaGrid(viewerState.imageSrc);
      setGridPreviewSrc(dataUrl);
    } catch (e) {
      console.error('场景概览生成失败:', e);
    } finally {
      setIsGeneratingGrid(false);
    }
  }, [viewerState.imageSrc, isGeneratingGrid]);

  return (
    <div className="relative min-h-screen w-full selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden flex flex-col">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 rounded-full blur-[120px] animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] bg-purple-900/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px] animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150 contrast-150"></div>
      </div>

      {/* Floating Header */}
      <header className="absolute top-0 left-0 w-full z-40 px-6 py-6 flex justify-between items-center pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto group cursor-default">
          <div className="relative">
             <div className="absolute inset-0 bg-indigo-500 blur-md opacity-40 group-hover:opacity-60 transition-opacity rounded-full"></div>
             <div className="relative bg-black/40 backdrop-blur-md border border-white/10 p-2.5 rounded-xl">
               <Aperture className="w-6 h-6 text-indigo-400" />
             </div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white/90">PanoView</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-medium">Professional</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
        
        {!viewerState.imageSrc ? (
          // Empty State / Landing
          <div className="max-w-4xl w-full animate-fade-in flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center mb-10 space-y-4">
              <h2 className="text-4xl sm:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40 tracking-tight pb-2">
                沉浸式全景视界
              </h2>
              <p className="text-lg text-gray-400 max-w-xl mx-auto font-light leading-relaxed">
                将您的等距柱状全景图拖入下方，即可开启 16:9 影院级 3D 漫游体验。
              </p>
            </div>

            <div className="w-full max-w-2xl transform transition-all duration-500 hover:scale-[1.01]">
              <FileUploader onFileSelect={handleFileSelect} />
            </div>
            
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center w-full max-w-3xl">
              {[
                { icon: Monitor, title: "16:9 影院画幅", desc: "专为沉浸式体验优化" },
                { icon: Sparkles, title: "8K 极清渲染", desc: "WebGL 硬件加速引擎" },
                { icon: Download, title: "4K 截图导出", desc: "所见即所得高清保存" },
              ].map((item, idx) => (
                <div key={idx} className="group p-5 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <item.icon className="w-6 h-6 text-indigo-300" />
                  </div>
                  <h3 className="font-semibold text-gray-200 mb-1">{item.title}</h3>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Viewer State
          <div className="w-full h-full flex flex-col items-center justify-center animate-slide-up relative">
             
             {/* The Main Stage */}
             <div className="relative w-full max-w-6xl aspect-video bg-black/40 rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_100px_-20px_rgba(99,102,241,0.2)] ring-1 ring-white/5 group">
                <PanoramaStage 
                  imageSrc={viewerState.imageSrc} 
                  screenshotTrigger={triggerScreenshot}
                  resetTrigger={triggerReset}
                />
                
                {/* Subtle Gradient Overlay at bottom for text contrast */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Filename Badge */}
                <div className="absolute top-6 left-6 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="bg-black/30 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-xs font-mono text-white/80 max-w-[200px] truncate">{viewerState.fileName}</span>
                  </div>
                </div>

                {/* Interaction Hint */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-100 transition-opacity duration-700 delay-1000"
                     style={{ opacity: 0 }}>
                </div>
             </div>

             {/* Floating Control Dock */}
             <div className="mt-8 flex items-center gap-3 p-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl animate-fade-in">
               
               <button
                 onClick={handleResetView}
                 className="group relative p-3 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                 title="重置视角"
               >
                 <RotateCcw className="w-5 h-5" />
                 <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black px-2 py-1 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10">重置</span>
               </button>

               <div className="w-px h-6 bg-white/10 mx-1"></div>

               <button
                 onClick={handleScreenshotRequest}
                 className="group relative flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium transition-all shadow-[0_0_20px_-5px_rgba(79,70,229,0.5)] hover:shadow-[0_0_30px_-5px_rgba(79,70,229,0.6)] active:scale-95"
               >
                 <Download className="w-4 h-4" />
                 <span>截图</span>
               </button>

               <button
                 onClick={handleGridExport}
                 disabled={isGeneratingGrid}
                 className="group relative flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-wait text-white rounded-full font-medium transition-all shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)] hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.6)] active:scale-95"
                 title="导出四方向场景概览四宫格"
               >
                 {isGeneratingGrid
                   ? <Loader2 className="w-4 h-4 animate-spin" />
                   : <LayoutGrid className="w-4 h-4" />
                 }
                 <span>{isGeneratingGrid ? '生成中…' : '场景概览'}</span>
               </button>

               <div className="w-px h-6 bg-white/10 mx-1"></div>

               <button
                 onClick={handleClear}
                 className="group relative p-3 rounded-full hover:bg-red-500/20 hover:text-red-400 text-gray-400 transition-colors"
                 title="关闭图片"
               >
                 <X className="w-5 h-5" />
                 <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black px-2 py-1 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10">关闭</span>
               </button>
             </div>
             
             <p className="mt-4 text-xs text-gray-500/50 font-mono tracking-widest uppercase">
               Scroll to Zoom &bull; Drag to Look
             </p>
          </div>
        )}
      </main>

      {/* 四宫格预览弹窗 */}
      {gridPreviewSrc && (
        <GridPreview
          src={gridPreviewSrc}
          onClose={() => setGridPreviewSrc(null)}
        />
      )}
    </div>
  );
};

export default App;