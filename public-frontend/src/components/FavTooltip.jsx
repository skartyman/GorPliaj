import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';

export default function FavTooltip({ children, onAction, type }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target) && triggerRef.current && !triggerRef.current.contains(e.target)) {
        setShow(false);
      }
    }
    if (show) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [show]);

  function handleTrigger(e) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, left: Math.min(rect.left, window.innerWidth - 300) });
    setShow(true);
  }

  const isMenu = type === 'menu';

  return (
    <>
      <span ref={triggerRef} onClick={handleTrigger} style={{ cursor: 'pointer' }}>
        {children}
      </span>
      {show && createPortal(
        <div ref={tooltipRef} className="fav-auth-tooltip" style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}>
          <button type="button" className="fav-auth-tooltip-close" onClick={() => setShow(false)} aria-label="Close">&times;</button>
          <div className="fav-auth-tooltip-icon">{isMenu ? '\u2605' : '\u2665'}</div>
          <div className="fav-auth-tooltip-title">
            {isMenu
              ? 'Зберігайте улюблені страви'
              : 'Зберігайте улюблені столики'}
          </div>
          <div className="fav-auth-tooltip-text">
            {isMenu
              ? 'Додавайте страви в улюблене, щоб швидко повторювати замовлення. Авторизуйтеся, щоб користуватися цією функцією.'
              : 'Додавайте столики в улюблене для швидкого бронювання. Авторизуйтеся, щоб користуватися цією функцією.'}
          </div>
          <Link to="/cabinet" className="fav-auth-tooltip-cta" onClick={() => setShow(false)}>
            Зареєструватися
          </Link>
        </div>,
        document.body
      )}
    </>
  );
}
