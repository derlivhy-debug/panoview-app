export interface ViewerState {
  imageSrc: string | null;
  fileName: string | null;
  isDragging: boolean;
}

export interface ScreenshotEvent {
  capture: () => void;
}