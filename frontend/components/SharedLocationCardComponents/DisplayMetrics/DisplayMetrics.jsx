import React from 'react';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LoopIcon from '@mui/icons-material/Loop';
import { formatDurationFromSeconds } from '../../../utils/time';
import { getImperialDist } from '../../../utils/distance';
import './DisplayMetrics.css';
import { SORT_MODES } from '../../../config/sortOptions';
import { getAvgDistanceLabel, getAvgTimeLabel } from '../../../utils/travelLabels';
import { TRAVEL_MODE_ICONS } from '../../../config/travelMode';

const METRIC_CONFIGS = [
  { key: SORT_MODES.AVG_TIME, formatter: formatDurationFromSeconds },
  { key: SORT_MODES.AVG_DISTANCE, formatter: getImperialDist },
];

function getIcon(travelMode, metricKey){
  if(metricKey === SORT_MODES.AVG_TIME){
    return AccessTimeIcon;
  } else {
    return TRAVEL_MODE_ICONS[travelMode];
  }
}

function getLabel(travelMode, metricKey){
  if(metricKey === SORT_MODES.AVG_TIME){
    return getAvgTimeLabel(travelMode);
  } else{
    return getAvgDistanceLabel(travelMode);
  }
}

function DisplayMetric({ syncingState, placeMetrics, travelMode, metricKey, formatter }) {

  const Icon = getIcon(travelMode, metricKey);
  const label = getLabel(travelMode, metricKey);
  const travelModeData = placeMetrics?.[travelMode];
  const hasTravelData = travelModeData && travelModeData.count > 0;

  // Compute the metric value ahead of render
  let metricValue = '-';
  if (hasTravelData) {
    metricValue = formatter(travelModeData[metricKey]);
  } else if (syncingState) {
    metricValue = <LoopIcon />;
  }

  return (
    <div className="display-metrics__item">
      {Icon && <Icon className="display-metrics__icon" />}
      <span className="display-metrics__value">{metricValue}</span>
      <span className="display-metrics__label">{label}</span>
    </div>
  );
}

export default function DisplayMetrics({ syncingMatrixData, placeMetrics, transportMode }) {
  return (
    <div className="display-metrics">
      <div className="display-metrics__container">
        {METRIC_CONFIGS.map(({ key, formatter }) => (
          <DisplayMetric
            key={key}
            syncingState={syncingMatrixData}
            placeMetrics={placeMetrics}
            travelMode={transportMode}
            metricKey={key}
            formatter={formatter}
          />
        ))}
      </div>
    </div>
  );
}