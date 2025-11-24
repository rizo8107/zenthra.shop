import React, { useEffect, useMemo, useRef } from 'react';
import { pb } from '@/lib/pocketbase';

interface ZenthraEmbedProps {
  path: string;
  title?: string;
  iframeId?: string;
  maxHeightVh?: number; // clamp iframe height to viewport percentage (e.g., 86)
}

const joinUrl = (base: string, path: string) => {
  const b = base.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
};

export const ZenthraEmbed: React.FC<ZenthraEmbedProps> = ({ path, title, iframeId, maxHeightVh = 86 }) => {
  const baseEnv = (import.meta.env.VITE_ZENTHRA_FRONTEND_URL as string | undefined);
  const base = (baseEnv && baseEnv.trim().length > 0) ? baseEnv : (typeof window !== 'undefined' ? window.location.origin : '');
  const src = useMemo(() => joinUrl(base, path), [base, path]);
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const d: any = e.data || {};
      if (!frameRef.current) return;

      if (d.type === 'ZENTHRA_EMBED_SIZE' && typeof d.height === 'number') {
        // If maxHeightVh <= 0, do not clamp to viewport height at all; let the
        // iframe grow to the full reported height so the outer page scrolls
        // normally. Otherwise, respect the provided vh cap.
        const hasClamp = maxHeightVh > 0;
        let height = Math.max(d.height, 400);

        if (hasClamp) {
          const vhMax = Math.max(40, Math.min(100, maxHeightVh));
          const maxPx = (typeof window !== 'undefined' ? window.innerHeight : 900) * (vhMax / 100);
          height = Math.min(height, Math.max(500, Math.floor(maxPx)));
        }

        frameRef.current.style.height = `${height}px`;
      }

      // Deliberately no auth hand-off for security; storefront must manage its own session
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [maxHeightVh]);

  return (
    <div className="w-full">
      <iframe
        ref={frameRef}
        id={iframeId || 'zenthra-embed'}
        src={src}
        title={title || 'Zenthra'}
        style={{
          width: '100%',
          border: 0,
          // Initial height: if maxHeightVh <= 0, use a generous default; otherwise
          // base it on the viewport percentage.
          height:
            maxHeightVh > 0
              ? `${Math.floor(((typeof window !== 'undefined' ? window.innerHeight : 900) * (maxHeightVh / 100)) || 700)}px`
              : `${Math.max(typeof window !== 'undefined' ? window.innerHeight : 900, 700)}px`,
        }}
      />
    </div>
  );
};

export default ZenthraEmbed;
