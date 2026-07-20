'use client'

import { useRef, useState } from "react";
import Drawer from '@mui/material/Drawer';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LocationDestCard from "./LocationDestCard";
import LocationHomeCard from "./LocationHomeCard";
import CardList from "./CardsList";
import { useMapFeatures } from "../context/MapContext";
import './LocationDrawer.css';
import "./MapView.css";
import { Merge, Settings2, MapPinOff } from 'lucide-react';


const drawerWidth = 460;
const drawerBleeding = 20;

export default function LocationDrawer() {
  const [open, setOpen] = useState(false);
  // const [sortBy, setSortBy] = useState('none');
  const menuButtonRef = useRef(null);
  const { destination, destHistory, home, homeHistory, historyType, toggleHistoryType, clearAllPins, clearAllCompares, clearHistory, activeRoutes, activePins} = useMapFeatures();

  const handleClose = () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    menuButtonRef.current?.focus();
    setOpen(false);
  };

  //TODO: 
  // CURRENT VERSION IS BAD I GUESS
  //  GOOD: Only creates a new reference if the underlying rows object actually changes
  // const sortedRows = useMemo(() => {
  //   return Object.values(rows);
  // }, [rows]);

  const cards = historyType === 'destination' ? (
    <CardList 
      locationsHistory={destHistory}
      activeLocations={activeRoutes}
      primary={destination}
      sortBy = {'distance'}
      CardComponent={LocationDestCard}
    />
  ) : (
    <CardList 
      locationsHistory={homeHistory}
      activeLocations={activePins}
      primary={home}
      CardComponent={LocationHomeCard}
    />
  );

  return (
    <div>
      {/* Menu button — hidden on mobile */}
      <div className="nav-buttons show-data-table-button menu-btn">
        <IconButton ref={menuButtonRef} onClick={() => setOpen(true)}>
          <MenuIcon />
        </IconButton>
      </div>

      {/* Desktop — right drawer */}
      <Drawer
        className="desktop-drawer"
        variant="persistent"
        anchor="right"
        open={open}
        onClose={handleClose}
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
          },
        }}
      >
        <div className="drawer-container">
          <div className="drawer-header">
            <IconButton onClick={handleClose}>
              <ChevronRightIcon />
            </IconButton>
            <div className="history-pill-group">
              <button 
                type="button"
                className={`history-pill-btn ${historyType === 'home' ? 'is-active' : ''}`}
                onClick={() => historyType !== 'home' && toggleHistoryType()}
              >
                Origins
              </button>
              <button 
                type="button"
                className={`history-pill-btn ${historyType === 'destination' ? 'is-active' : ''}`}
                onClick={() => historyType !== 'destination' && toggleHistoryType()}
              >
                Destinations
              </button>
            </div>

            {historyType === 'destination' ? 
              (
                <IconButton onClick={() => clearAllCompares()}>
                  <Merge />
                </IconButton>
              ) : (
                <IconButton onClick={() => clearAllPins()}>
                  <MapPinOff/>
                </IconButton>
              )
            }
            <IconButton onClick={() => console.log("expand menu")}>
              <Settings2 />
            </IconButton>

            <button className="btn-clear-all" onClick={() => clearHistory()}>
              Clear All
            </button>
          </div>
        </div>
        {cards}
      </Drawer>

      {/* Mobile — bottom swipeable drawer */}
      {/* TODO: first have people tap to fully extend then they can slide down to close it */}
      <SwipeableDrawer
        anchor="bottom"
        open={open}
        onClose={handleClose}
        onOpen={() => setOpen(true)}
        swipeAreaWidth={drawerBleeding}
        disableSwipeToOpen={false}
        keepMounted
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            height: '75vh',
            overflow: 'visible',
            borderTopLeftRadius: '12px',
            borderTopRightRadius: '12px',
          },
        }}
      >
        <div className="puller-tab" onClick={() => open ? handleClose() : setOpen(true)}>
          <div className="puller" />
        </div>
        <div className="mobile-drawer-inner">
          <div className="drawer-header">
            <button className="btn-clear-all" onClick={() => clearHistory()}>
              Clear All
            </button>
          </div>
          <div className="mobile-card-list">
            {cards}
          </div>
        </div>
      </SwipeableDrawer>
    </div>
  );
}
