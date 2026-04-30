'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   LocationCard — redesigned result card
   Visual changes vs. v1:
     · Tighter padding and a cleaner visual hierarchy
     · Name truncates to two lines (was unlimited height)
     · Rating, cost, and distance row uses pill badges instead of plain text
     · Transport options are horizontal pills with icon + duration
     · Action buttons are a compact icon-row at the bottom (icon + label)
     · Subtle border instead of a heavy box shadow
   Logic is unchanged — same MapContext hooks, same button handlers.
───────────────────────────────────────────────────────────────────────────── */

import { Trash2, Navigation, Star, DollarSign, Eye } from 'lucide-react';
import { formatDurationFromSeconds } from '../utils/time';
import { getImperialDist } from '../utils/distance';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import DriveEtaIcon from '@mui/icons-material/DriveEta';
import DirectionsTransitFilledIcon from '@mui/icons-material/DirectionsTransitFilled';
import './LocationCard.css';
import { useMapFeatures } from '../context/MapContext';

export default function LocationCard({ place }) {
  const { deleteFromHistory, setDestination, toggleActiveRoute } = useMapFeatures();

  return (
    <div className="lc-card">

      {/* ── Name ── */}
      <h2 className="lc-title">{place.name}</h2>

      {/* ── Meta row: rating · cost · distance ── */}
      <div className="lc-meta">
        {place.ratings !== 'N/A' && (
          <span className="lc-badge lc-badge--rating">
            <Star className="lc-badge__icon lc-badge__icon--star" />
            {place.ratings.toFixed(1)}
          </span>
        )}
        {place.cost !== 'N/A' && (
          <span className="lc-badge lc-badge--cost">
            {[...Array(place.cost.length)].map((_, i) => (
              <DollarSign key={i} className="lc-dollar lc-dollar--active" />
            ))}
            {[...Array(4 - place.cost.length)].map((_, i) => (
              <DollarSign key={i + place.cost.length} className="lc-dollar lc-dollar--inactive" />
            ))}
          </span>
        )}
        <span className="lc-badge lc-badge--distance">
          {getImperialDist(place.distance)}
        </span>
      </div>

      {/* ── Transport options ── */}
      <div className="lc-transport">
        <div className="lc-transport-option">
          <DriveEtaIcon className="lc-transport-icon" />
          <span>{formatDurationFromSeconds(place.driveTime)}</span>
        </div>
        <div className="lc-transport-option">
          <DirectionsWalkIcon className="lc-transport-icon" />
          <span>{formatDurationFromSeconds(place.walkTime)}</span>
        </div>
        <div className="lc-transport-option">
          <DirectionsTransitFilledIcon className="lc-transport-icon" />
          <span>{formatDurationFromSeconds(place.transitTime)}</span>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="lc-actions">
        <button className="lc-btn lc-btn--primary" onClick={() => setDestination(place.destObj)}>
          <Navigation className="lc-btn__icon" />
          Route
        </button>
        <button className="lc-btn lc-btn--secondary" onClick={() => toggleActiveRoute(place.destObj)}>
          <Eye className="lc-btn__icon" />
          Show
        </button>
        <button className="lc-btn lc-btn--danger" onClick={() => deleteFromHistory(place.desPlaceId)}>
          <Trash2 className="lc-btn__icon" />
        </button>
      </div>

    </div>
  );
}
