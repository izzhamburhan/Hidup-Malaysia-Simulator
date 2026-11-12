// A Viral Hari Ini picture: the card's pixel scene (or its ready-made pixel image) on a canvas,
// scaled up with hard edges.

import { useEffect, useRef } from 'react';
import { VIRAL_SCENES, type ViralItem } from '../../data/viral';
import { PIC_H, PIC_W, loadViralImage, paintPicture } from '../../lib/viralCard';

export function ViralPicture({ item, className, label }: { item: ViralItem; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let live = true;
    paintPicture(canvas, item, VIRAL_SCENES[item.scene], null);
    if (item.image) {
      void loadViralImage(item).then((img) => {
        if (live && img && ref.current) paintPicture(ref.current, item, VIRAL_SCENES[item.scene], img);
      });
    }
    return () => {
      live = false;
    };
  }, [item]);
  return <canvas ref={ref} width={item.image ? 192 : PIC_W} height={item.image ? 108 : PIC_H} className={className} style={{ imageRendering: 'pixelated' }} role="img" aria-label={label ?? item.topic.en} />;
}