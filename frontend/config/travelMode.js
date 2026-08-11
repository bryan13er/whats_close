import DriveEtaIcon from '@mui/icons-material/DriveEta';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import DirectionsTransitFilledIcon from '@mui/icons-material/DirectionsTransitFilled';

export const TRAVEL_MODES = Object.freeze({
  DRIVE: 'drive',
  WALK: 'walk',
  TRANSIT: 'transit',
});

// 1. Reusable map strictly for base travel mode icons
export const TRAVEL_MODE_ICONS = {
  [TRAVEL_MODES.DRIVE]: DriveEtaIcon,
  [TRAVEL_MODES.WALK]: DirectionsWalkIcon,
  [TRAVEL_MODES.TRANSIT]: DirectionsTransitFilledIcon,
};

