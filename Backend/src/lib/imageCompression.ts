export type CompressionProgressHandler = (progress: number) => void;

export interface CompressImageOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  signal?: AbortSignal;
  onProgress?: CompressionProgressHandler;
}

const DEFAULT_OPTIONS: Required<Omit<CompressImageOptions, 'signal' | 'onProgress'>> = {
  quality: 0.82,
  maxWidth: 1600,
  maxHeight: 1600,
};

const reportProgress = (
  handler: CompressionProgressHandler | undefined,
  value: number,
) => {
  if (handler) {
    handler(Math.min(100, Math.max(0, Math.round(value))));
  }
};

async function loadImageBitmap(
  file: File,
  signal?: AbortSignal,
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return await createImageBitmap(file);
  }

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const cleanup = () => {
      URL.revokeObjectURL(url);
      signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = () => {
      cleanup();
      reject(new DOMException('Image loading aborted', 'AbortError'));
    };

    signal?.addEventListener('abort', onAbort);

    img.onload = () => {
      cleanup();
      resolve(img);
    };

    img.onerror = (err) => {
      cleanup();
      reject(err instanceof Error ? err : new Error('Failed to load image'));
    };

    img.src = url;
  });
}

function getTargetDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  let width = sourceWidth;
  let height = sourceHeight;

  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const ratio = Math.min(widthRatio, heightRatio, 1);

  width = Math.max(1, Math.round(width * ratio));
  height = Math.max(1, Math.round(height * ratio));

  return { width, height };
}

export async function compressImageToWebp(
  file: File,
  options: CompressImageOptions = {},
): Promise<File> {
  const { quality, maxWidth, maxHeight } = { ...DEFAULT_OPTIONS, ...options };
  const { signal, onProgress } = options;

  reportProgress(onProgress, 5);

  const imageSource = await loadImageBitmap(file, signal);
  reportProgress(onProgress, 25);

  const width = 'width' in imageSource ? imageSource.width : (imageSource as any).naturalWidth;
  const height = 'height' in imageSource ? imageSource.height : (imageSource as any).naturalHeight;

  const { width: targetWidth, height: targetHeight } = getTargetDimensions(
    width,
    height,
    maxWidth,
    maxHeight,
  );

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to obtain 2D rendering context');
  }

  if ('close' in imageSource && typeof (imageSource as ImageBitmap).close === 'function') {
    try {
      ctx.drawImage(imageSource as ImageBitmap, 0, 0, targetWidth, targetHeight);
    } finally {
      (imageSource as ImageBitmap).close();
    }
  } else {
    ctx.drawImage(imageSource as HTMLImageElement, 0, 0, targetWidth, targetHeight);
  }

  reportProgress(onProgress, 60);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) {
          resolve(result);
        } else {
          reject(new Error('Canvas compression failed'));
        }
      },
      'image/webp',
      quality,
    );
  });

  reportProgress(onProgress, 100);

  const baseName = file.name.replace(/\.[^.]+$/, '');
  const webpName = `${baseName}.webp`;

  return new File([blob], webpName, {
    type: 'image/webp',
    lastModified: Date.now(),
  });
}
