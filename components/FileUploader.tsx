import React, { useRef, useState } from 'react';
import { ImagePlus, ArrowUpCircle } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcess(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndProcess(e.target.files[0]);
    }
  };

  const validateAndProcess = (file: File) => {
    if (file.type.startsWith('image/')) {
      onFileSelect(file);
    } else {
      alert('请上传有效的图片文件。');
    }
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative group cursor-pointer overflow-hidden
        w-full h-80 rounded-3xl
        flex flex-col items-center justify-center
        transition-all duration-500 ease-out
        ${isDragging 
          ? 'scale-[1.02] bg-indigo-500/10' 
          : 'bg-white/5 hover:bg-white/10'
        }
      `}
    >
      {/* Animated Gradient Border */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isDragging ? 'opacity-100' : ''}`}>
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-20 blur-xl"></div>
      </div>
      
      {/* Dashed Border Overlay */}
      <div className={`absolute inset-[2px] rounded-3xl border-2 border-dashed transition-colors duration-300 z-10 ${isDragging ? 'border-indigo-400/50' : 'border-white/10 group-hover:border-white/20'}`}></div>

      <input
        type="file"
        ref={inputRef}
        onChange={handleChange}
        accept="image/*"
        className="hidden"
      />
      
      <div className="relative z-20 flex flex-col items-center p-8 text-center">
        <div className={`
          w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-2xl transition-all duration-500
          ${isDragging 
            ? 'bg-indigo-500 text-white rotate-12 scale-110' 
            : 'bg-gradient-to-br from-gray-800 to-black border border-white/10 text-gray-400 group-hover:text-white group-hover:scale-110 group-hover:border-indigo-500/50'
          }
        `}>
           {isDragging ? (
              <ArrowUpCircle className="w-10 h-10" />
           ) : (
              <ImagePlus className="w-10 h-10" />
           )}
        </div>

        <h3 className="text-xl font-semibold text-white mb-2 tracking-tight group-hover:text-indigo-200 transition-colors">
          {isDragging ? '松开即刻上传' : '点击或拖拽上传全景图'}
        </h3>
        
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
          支持 <span className="text-gray-300">JPG, PNG, WEBP</span> 等格式<br/>
          推荐使用 2:1 比例的等距柱状全景图
        </p>

        <div className="mt-6 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-gray-400 uppercase tracking-widest font-mono group-hover:bg-white/10 transition-colors">
          Max File Size: Unlimited
        </div>
      </div>
    </div>
  );
};

export default FileUploader;