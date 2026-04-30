'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   BottomSheet — custom draggable mobile bottom sheet
   Used by LocationDrawer to replace MUI SwipeableDrawer.

   Snap positions (sheet translateY from viewport top):
     FULL       56px            (~92% of screen visible)
     HALF       44% of height   (~56% visible)
     COLLAPSED  height – 112px  (handle + 112px peek, effectively hidden)

   On mount, the sheet starts at COLLAPSED and immediately transitions
   to defaultSnap — giving the Apple Maps "slide up on appear" animation.

   Gesture notes:
     - Touch listeners are attached imperatively with { passive: false }
       on touchmove so we can call preventDefault() and prevent body scroll
       while the user is dragging the sheet.
     - Position is written directly to el.style.transform during a drag
       (no React re-renders → 60fps). React state updates only on touchend
       so the CSS transition can animate to the final snap position.
     - Flick velocity (px/ms) at touchend shifts the resolved snap one step
       further in the drag direction (same algorithm Apple Maps uses).
───────────────────────────────────────────────────────────────────────────── */

import { useState, useRef, useEffect } from 'react';
import './BottomSheet.css';

const SNAP_NAMES = ['full', 'half', 'collapsed'];

function snapY(name, h) {
  if (name === 'full')      return 56;
  if (name === 'half')      return Math.round(h * 0.44);
  /* collapsed */           return h - 112;
}

function resolveSnap(currentY, h, velPxPerMs) {
  const FLICK = 0.35; // px/ms threshold for a flick gesture
  let nearestIdx = 0, nearestDist = Infinity;
  SNAP_NAMES.forEach((name, i) => {
    const d = Math.abs(snapY(name, h) - currentY);
    if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
  });
  if (velPxPerMs >  FLICK) nearestIdx = Math.min(nearestIdx + 1, SNAP_NAMES.length - 1);
  if (velPxPerMs < -FLICK) nearestIdx = Math.max(nearestIdx - 1, 0);
  return SNAP_NAMES[nearestIdx];
}

export default function BottomSheet({ defaultSnap = 'half', children }) {
  const [snap, setSnap]   = useState('collapsed');
  const sheetRef          = useRef(null);
  const snapRef           = useRef('collapsed'); // event listeners read this to avoid stale closures
  useEffect(() => { snapRef.current = snap; }, [snap]);

  /* ── Animate to the new snap point whenever state changes ── */
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const h = window.innerHeight;
    el.style.transition = 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)';
    el.style.transform  = `translateY(${snapY(snap, h)}px)`;
  }, [snap]);

  /* ── On mount: position collapsed (no animation), then slide to defaultSnap ── */
  useEffect(() => {
    const el = sheetRef.current;
    if (!el) return;
    const h = window.innerHeight;
    el.style.transition = 'none';
    el.style.transform  = `translateY(${snapY('collapsed', h)}px)`;
    void el.offsetHeight; // force reflow so next transition doesn't skip from 0

    const timer = setTimeout(() => setSnap(defaultSnap), 80);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Imperative non-passive touch listeners on the drag handle zone ── */
  useEffect(() => {
    const handle = sheetRef.current?.querySelector('[data-sheet-handle]');
    if (!handle) return;

    let startTouchY = 0, startTranslate = 0;
    let lastY = 0, lastTime = 0, velocity = 0;

    function onTouchStart(e) {
      const h = window.innerHeight;
      const t = e.touches[0];
      startTouchY    = t.clientY;
      startTranslate = snapY(snapRef.current, h);
      lastY          = t.clientY;
      lastTime       = Date.now();
      velocity       = 0;
      const el = sheetRef.current;
      if (el) el.style.transition = 'none';
    }

    function onTouchMove(e) {
      e.preventDefault(); // block body scroll while dragging the sheet
      const t   = e.touches[0];
      const now = Date.now();
      const dt  = now - lastTime;
      if (dt > 0) velocity = (t.clientY - lastY) / dt;
      lastY    = t.clientY;
      lastTime = now;

      const h    = window.innerHeight;
      const newY = Math.max(40, Math.min(h - 80, startTranslate + (t.clientY - startTouchY)));
      const el   = sheetRef.current;
      if (el) el.style.transform = `translateY(${newY}px)`;
    }

    function onTouchEnd() {
      const el = sheetRef.current;
      const h  = window.innerHeight;
      const match    = el?.style.transform.match(/translateY\(([0-9.]+)px\)/);
      const currentY = match ? parseFloat(match[1]) : snapY(snapRef.current, h);
      const target   = resolveSnap(currentY, h, velocity);
      if (el) {
        el.style.transition = 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)';
        el.style.transform  = `translateY(${snapY(target, h)}px)`;
      }
      setSnap(target);
    }

    handle.addEventListener('touchstart', onTouchStart, { passive: true  });
    handle.addEventListener('touchmove',  onTouchMove,  { passive: false });
    handle.addEventListener('touchend',   onTouchEnd,   { passive: true  });
    return () => {
      handle.removeEventListener('touchstart', onTouchStart);
      handle.removeEventListener('touchmove',  onTouchMove);
      handle.removeEventListener('touchend',   onTouchEnd);
    };
  }, []);

  return (
    <div ref={sheetRef} className="bs-sheet">

      {/* ── Touch-drag zone: tapping the handle also toggles half ↔ full ── */}
      <div
        className="bs-handle-zone"
        data-sheet-handle
        onClick={() => setSnap(prev => prev === 'full' ? 'half' : 'full')}
      >
        <div className="bs-handle" />
      </div>

      {/* ── Scrollable card list (only scrollable when at FULL snap) ── */}
      <div className={`bs-content${snap === 'full' ? ' bs-content--scrollable' : ''}`}>
        {children}
      </div>

    </div>
  );
}
