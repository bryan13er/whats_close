import React from 'react';
import { useMapFeatures } from "../context/MapContext";
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import './SubMenu.css'
import { ArrowDownWideNarrow, ArrowUpWideNarrow } from 'lucide-react';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import DriveEtaIcon from '@mui/icons-material/DriveEta';
import DirectionsTransitFilledIcon from '@mui/icons-material/DirectionsTransitFilled';
import { SORT_OPTIONS } from '../config/sortOptions';
import { ORDER_BY_MODES } from '../config/orderOptions';

export default function SubMenu({historyType, handleSortByChange, handleOrderByToggle, currOption, orderBy, activeTravelModes, toggleSingleTravelModeOn}) {
  const id = React.useId();
  const buttonId = `${id}-button`;
  const menuId = `${id}-menu`;
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const OrderByIcon = orderBy ===  ORDER_BY_MODES.DESC ? ArrowDownWideNarrow : ArrowUpWideNarrow;

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // 3. Dynamically resolve available options for the active tab
  const sortOptions = SORT_OPTIONS[historyType] ?? [];

  return (
    <div className='sub-menu'>
      <div>
        <button onClick={handleClick} className='btn-sort-by'>
          <span className='sort-by-prefix'>Sort By </span>
          <span className='sort-by-label'>{currOption.label}</span>
        </button>
        <Menu
          id={menuId}
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          slotProps={{
            list: {
              'aria-labelledby': buttonId,
            },
          }}
        >
          {/* 4. Map over options to render dynamic MenuItems */}
          {sortOptions.map((option) => {

            return (
              <MenuItem
                key={option.key}
                selected={option.key === currOption.key}
                onClick={() => {
                  handleSortByChange(option)
                  handleClose();
                }}
              >
                {option.label}: {orderBy === ORDER_BY_MODES.DESC ? option.descLabel : option.ascLabel}
              </MenuItem>
            );
          })}
        </Menu>
      </div>
      <IconButton onClick={handleOrderByToggle}>
        <OrderByIcon/>
      </IconButton>
      {/* toggle args have to match key names defined in the default state in MapContext.js consider using a loop later*/}
      <div className='transport-pill-group'>
        <button 
          className={`transport-pill-btn ${activeTravelModes.drive ? 'is-active' : ''}`}
          onClick={() => toggleSingleTravelModeOn('drive')}
        >
          <DriveEtaIcon/>
        </button>
        <button 
          className={`transport-pill-btn ${activeTravelModes.walk ? 'is-active' : ''}`}
          onClick={() => toggleSingleTravelModeOn('walk')}
        >
          <DirectionsWalkIcon/>
        </button>
        <button
          className={`transport-pill-btn ${activeTravelModes.transit ? 'is-active' : ''}`}
          onClick={() => toggleSingleTravelModeOn('transit')}
        >
          <DirectionsTransitFilledIcon/>
        </button>
      </div>
    </div>
  );
}