import { useCallback, useEffect, useRef, useState } from 'react';

export default function GalleryCarousel({ images }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);
  const touchRef = useRef({ startX: 0, startY: 0 });

  const goTo = useCallback((index) => {
    setCurrent((index + images.length) % images.length);
  }, [images.length]);

  const next = useCallback(() => goTo(current + 1), [goTo, current]);
  const prev = useCallback(() => goTo(current - 1), [goTo, current]);

  useEffect(() => {
    if (!images.length || paused) {
      window.clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = window.setInterval(next, 4000);
    return () => window.clearInterval(intervalRef.current);
  }, [images.length, paused, next]);

  useEffect(() => {
    setCurrent(0);
  }, [images]);

  const handleTouchStart = (event) => {
    touchRef.current.startX = event.touches[0].clientX;
    touchRef.current.startY = event.touches[0].clientY;
  };

  const handleTouchEnd = (event) => {
    const dx = event.changedTouches[0].clientX - touchRef.current.startX;
    const dy = event.changedTouches[0].clientY - touchRef.current.startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx > 0) prev();
      else next();
    }
  };

  if (!images.length) return null;

  return (
    <div
      className="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="carousel-viewport">
        {images.map((url, i) => (
          <div key={url} className={`carousel-slide${i === current ? ' active' : ''}`}>
            <img src={url} alt="" draggable={false} />
          </div>
        ))}
      </div>
      <button type="button" className="carousel-btn carousel-prev" onClick={prev} aria-label="Previous">‹</button>
      <button type="button" className="carousel-btn carousel-next" onClick={next} aria-label="Next">›</button>
      <div className="carousel-dots">
        {images.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`carousel-dot${i === current ? ' active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
