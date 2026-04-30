'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   LocationDrawer

   Desktop (≥ 600px): MUI persistent Drawer anchored to the right (unchanged).
                       Opened/closed via the menu icon button.

   Mobile (< 600px):  Custom BottomSheet replaces MUI SwipeableDrawer.
                       LocationDrawer is only mounted when destHistory.length > 0
                       (controlled by MapWithBox), so the sheet auto-opens with
                       a "slide up" animation every time new destinations appear.
                       Three snap points (collapsed / half / full) let the user
                       reveal as much of the card list as they want. Tapping
                       the handle toggles between half and full.
───────────────────────────────────────────────────────────────────────────── */

import { useRef, useState } from 'react';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocationCard from './LocationCard';
import BottomSheet from './BottomSheet';
import { useMapFeatures } from '../context/MapContext';
import './LocationDrawer.css';

const DRAWER_WIDTH = 460;

export default function LocationDrawer() {
  /* Desktop drawer open/close state (menu button) */
  const [desktopOpen, setDesktopOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const { setDestHistory, rows } = useMapFeatures();

  function handleDesktopClose() {
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    menuButtonRef.current?.focus();
    setDesktopOpen(false);
  }

  /* Shared card list rendered in both desktop and mobile layouts */
  const cardList = (
    <div className="bs-card-list">
      {rows.map((row) => (
        <LocationCard key={row.desPlaceId} place={row} />
      ))}
    </div>
  );

  return (
    <div>

      {/* ── Menu button — desktop only (CSS hides it on mobile) ── */}
      <div className="nav-buttons show-data-table-button menu-btn">
        <IconButton ref={menuButtonRef} onClick={() => setDesktopOpen(true)}>
          <MenuIcon />
        </IconButton>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          DESKTOP — MUI right-side drawer (unchanged from v1)
      ══════════════════════════════════════════════════════════════ */}
      <Drawer
        className="desktop-drawer"
        variant="persistent"
        anchor="right"
        open={desktopOpen}
        onClose={handleDesktopClose}
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
        }}
      >
        <div className="drawer-header">
          <IconButton onClick={handleDesktopClose}>
            <ChevronRightIcon />
          </IconButton>
          <button className="btn-clear-all" onClick={() => setDestHistory([])}>
            Clear All
          </button>
        </div>
        <div className="card-list">{cardList}</div>
      </Drawer>

      {/* ══════════════════════════════════════════════════════════════
          MOBILE — custom three-snap bottom sheet (replaces MUI SwipeableDrawer)
          Visible only on mobile via CSS (display:none on desktop).
          Opens automatically to "half" when this component first mounts.
      ══════════════════════════════════════════════════════════════ */}
      <div className="mobile-sheet-wrapper">
        <BottomSheet defaultSnap="half">
          <div className="bs-drawer-header">
            <span className="bs-drawer-title">Nearby Places</span>
            <button className="btn-clear-all" onClick={() => setDestHistory([])}>
              Clear All
            </button>
          </div>
          {cardList}
        </BottomSheet>
      </div>

    </div>
  );
}
