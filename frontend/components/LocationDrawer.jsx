'use client'

import { useRef, useState } from "react";
import Drawer from '@mui/material/Drawer';
import SwipeableDrawer from '@mui/material/SwipeableDrawer';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocationDestCard from "./LocationDestCard";
import LocationHomeCard from "./LocationHomeCard";
import { useMapFeatures } from "../context/MapContext";
import './LocationDrawer.css';
import "./MapView.css";


const drawerWidth = 460;
const drawerBleeding = 20;

export default function LocationDrawer() {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const { setDestHistory, destRows, homeHistory, historyType, toggleHistoryType} = useMapFeatures();

  const handleClose = () => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    menuButtonRef.current?.focus();
    setOpen(false);
  };

  //TODO: REMEBER THAT THE INPUT TO DATA DRAWER is an array not an object
  // CURRENT VERSION IS BAD I GUESS
  //  GOOD: Only creates a new reference if the underlying rows object actually changes
  // const sortedRows = useMemo(() => {
  //   return Object.values(rows);
  // }, [rows]);
  const rowData = historyType === "destination" ? destRows : Object.values(homeHistory);
  console.log("row data:", rowData);

  const cards = (
    <div className="card-list">
      {rowData.map((row) => {
        if (historyType === "destination"){
          return(
            <LocationDestCard key={row.desPlaceId} place={row}/>
          );
        } else {
          // TODO: make sure to fix it when I make a proper Home object the placeId value
          return(
            <LocationHomeCard key={row.placeId} place={row}/>
          );
        }
      })}
    </div>
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
        <div className="drawer-header">
          <IconButton onClick={handleClose}>
            <ChevronRightIcon />
          </IconButton>
          <button onClick={toggleHistoryType}>
            {historyType === 'destination' ? 'Destinations' : 'Origins'}
          </button>
          <button className="btn-clear-all" onClick={() => setDestHistory({})}>
            Clear All
          </button>
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
            <button className="btn-clear-all" onClick={() => setDestHistory({})}>
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
