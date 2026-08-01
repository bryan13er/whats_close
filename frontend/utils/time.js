
/*
Goal is to store the helper functions in here
*/

export function formatDurationFromSeconds(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || !Number.isFinite(totalSeconds)) {
    return 'No Route';
  }

  if(totalSeconds === 0) return '-';

  const secondsInDay  = 86400;
  const secondsInHour = 3600;
  const secondsInMin  = 60;

  let time = '';

  if (totalSeconds >= secondsInDay) {
    const days = Math.floor(totalSeconds / secondsInDay);
    totalSeconds %= secondsInDay;
    time += `${days}d `;
  }

  if (totalSeconds >= secondsInHour) {
    const hours = Math.floor(totalSeconds / secondsInHour);
    totalSeconds %= secondsInHour;
    time += `${hours}h `;
  }

  if (totalSeconds >= secondsInMin) {
    const remSec = totalSeconds % secondsInMin;
    const round = remSec >= 45 ? 1 : 0;
    const mins = Math.floor(totalSeconds / secondsInMin) + round;
    time += `${mins}min `;
  }

  return time.trim();
}

// TODO: should defintely only expect a string
// duartion value looks like this for all travel modes
// "duration": "419s",
// returns an int for the seconds
export function cleanTimeRes(travelMode) {
  const numSys = 10
  if (travelMode?.condition === 'ROUTE_NOT_FOUND'){
    return null;
  } else {
    // have to clean response
    return parseInt(travelMode?.duration?.replace('s', ''), numSys);
  }
}

