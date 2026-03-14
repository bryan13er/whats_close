"use client";

import * as React from 'react';
import { useState, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import DirectionsCarFilledIcon from '@mui/icons-material/DirectionsCarFilled';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { RoutesMatrixAPI } from '../routes-matrix-api';
import { PlacesApi } from '../place-api';
import './DestInfoTable.css';

// name, dist, drive time, walk time, hours, rating, avg cost if available, 
// TODO: public transport time 

function formatDurationFromSeconds(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined || !Number.isFinite(totalSeconds)) {
    return 'No Route';
  }

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

function getImperialDist(meters) {
  const miles = (meters * 0.000621371).toFixed(1);
  const formatted = miles.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${formatted}mi`;
}

const columns = [
  { id: 'name', 
    label: 'Name', 
    minWidth: 170,
    sticky: true,
  },
  { id: 'distance', 
    label: 'Distance', 
    minWidth: 100,  
    format: getImperialDist
  },
  { id: 'driveTime', 
    label:<><DirectionsCarFilledIcon fontSize="medium" /></>,
    minWidth: 100,
    format: formatDurationFromSeconds
  },
  { id: 'walkTime', 
    label:<><DirectionsWalkIcon fontSize='medium' /></>,
    minWidth: 100,
    format: formatDurationFromSeconds
  },
  { id: 'transitTime', 
    label:<><DirectionsBusIcon fontSize='medium' /></>,
    minWidth: 100,
    format: formatDurationFromSeconds
  },
  // { id: 'hours', 
  //   label:'Hours', 
  //   minWidth: 100
  // },
  { id: 'ratings',
    label:'Ratings', 
    minWidth: 100
  },
  { id: 'cost',
    label:'Cost',
    minWidth: 100,
  },
];

const stickyLeftOffsets = (() => {
  let left = 0;
  const offsets = {};
  for (const column of columns) {
    if (!column.sticky) continue;
    offsets[column.id] = left;
    left += column.minWidth ?? 0;
  }
  return offsets;
})();

const tableMinWidth = columns.reduce((sum, column) => sum + (column.minWidth ?? 0), 0);

function createData(name, distance, driveTime, walkTime, transitTime, ratings, cost, desPlaceId) {
  return {name, distance, driveTime, walkTime, transitTime, ratings, cost, desPlaceId};
}

function cleanTimeRes(travelMode) {
  const numSys = 10
  if (travelMode?.condition === 'ROUTE_NOT_FOUND'){
    return null;
  } else {
    // have to clean response
    return parseInt(travelMode?.duration?.replace('s', ''), numSys);
  }
}

const priceMap = {
  PRICE_LEVEL_UNSPECIFIED: null,
  PRICE_LEVEL_FREE: "$0",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$"
};

function createDataLookup(res){
  if (!res || !Array.isArray(res)) return {};

  const lookup = {};
  res.forEach(item => {
    lookup[item.destinationIndex] = item;
  });
  return lookup;
}

function prepRowData(dest, driveData, walkData, transitData, placeInfo){
  const destName         = dest.name;
  const desPlaceId       = dest.placeId
  const driveDistMeters  = driveData.distanceMeters;
  const driveSec         = cleanTimeRes(driveData);
  const walkSec          = cleanTimeRes(walkData);
  const transitSec       = cleanTimeRes(transitData);
  const rating           = placeInfo?.rating ?? "N/A";
  const cost             = priceMap[placeInfo?.priceLevel] ?? "N/A";

  return createData(
    destName,
    driveDistMeters,
    driveSec,
    walkSec,
    transitSec,
    rating,
    cost,
    desPlaceId,
  )
}



//TODO: think about how to display open hours later
// function cleanHours(place) {
//   if (!place) return null;
//   const hoursArray = place?.regularOpeningHours?.weekdayDescriptions ?? [];
// }

export default function StickyHeadTable({apiKey, home, destinations}) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const loadTableData = async () => {
      try {
        if (!home || destinations.length === 0) {
          setRows([]);
          return;
        }

        const routesApi = new RoutesMatrixAPI(apiKey);
        const placesApi = new PlacesApi(apiKey);
        console.log(apiKey);
  
        // 1. Fire all "batch" requests at once
        const [driveRes, walkRes, transitRes, placesRes] = await Promise.all([
          routesApi.computeMatrix(home, destinations, "DRIVE"),
          routesApi.computeMatrix(home, destinations, "WALK"),
          routesApi.computeMatrix(home, destinations, "TRANSIT"),
          Promise.all(destinations.map(dest => placesApi.getPlaceDetails(dest.placeId)))
        ]);

        const driveResLookUp = createDataLookup(driveRes);
        const walkResLookUp  = createDataLookup(walkRes);
        const transitResLookUp = createDataLookup(transitRes);

        // 2. Map the results into your row format
        // Maps and Matrices return results in the same order as your input array
        const newRows = destinations.map((dest, index) => {
          const drive = driveResLookUp[index];
          const walk = walkResLookUp[index];
          const transit = transitResLookUp[index];
          const place = placesRes[index];
  
          return prepRowData(dest, drive, walk, transit, place);
        });
  
        // 3. Set the state once to avoid multiple re-renders
        setRows(newRows);
      } catch (err) {
        console.error("Initialization failed:", err);
      }
    };
  
    loadTableData();
  }, [apiKey, home, destinations]); // refresh when inputs change

  const maxPage = Math.max(0, Math.ceil(rows.length / rowsPerPage) - 1);
  const pageClamped = Math.min(page, maxPage);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleDeleteRow = (rowPlaceId) => {
    setRows(prev => prev.filter(row => row.desPlaceId !== rowPlaceId));
  };

  return (
    <Paper elevation={3} className="destInfoTablePaper">
      <TableContainer className="destInfoTableContainer">
        <Table
          stickyHeader
          aria-label="sticky table"
          className="destInfoTableTable"
          style={{ '--table-min-width': `${tableMinWidth}px` }}
        >
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  className={[
                    'destInfoTableCell',
                    column.sticky ? 'destInfoTableSticky destInfoTableStickyHead' : null,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    '--col-min-width': `${column.minWidth ?? 0}px`,
                    ...(column.sticky ? { '--sticky-left': `${stickyLeftOffsets[column.id]}px` } : {}),
                  }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows
              .slice(pageClamped * rowsPerPage, pageClamped * rowsPerPage + rowsPerPage)
              .map((row) => {
                return (
                  <TableRow hover role="checkbox" tabIndex={-1} key={row.desPlaceId} aria-label={row.desPlaceId}>
                    {columns.map((column) => {
                      const value = row[column.id];
                      return (
                        <TableCell
                          key={column.id}
                          align={column.align}
                          className={[
                            'destInfoTableCell',
                            column.sticky ? 'destInfoTableSticky destInfoTableStickyBody' : null,
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          style={{
                            '--col-min-width': `${column.minWidth ?? 0}px`,
                            ...(column.sticky ? { '--sticky-left': `${stickyLeftOffsets[column.id]}px` } : {}),
                          }}
                        >
                          {column.id === 'name' ? (
                            <Box className="destInfoTableNameCell">
                              <Box className="destInfoTableNameText">{value}</Box>
                              <IconButton
                                size="small"
                                aria-label={`delete ${row.desPlaceId}`}
                                onClick={() => handleDeleteRow(row.desPlaceId)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          ) : (
                            (column.format ? column.format(value) : value)
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 100]}
        component="div"
        count={rows.length}
        rowsPerPage={rowsPerPage}
        page={pageClamped}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        className="destInfoTablePagination"
      />
    </Paper>
  );
}
