"use client";

import { useState } from 'react';
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
import './DestInfoTable.css';
import { formatDurationFromSeconds } from '../utils/time';
import { getImperialDist } from '../utils/distance';
import { useMapFeatures } from "../context/MapContext";
import RouteIcon from '@mui/icons-material/Route';


// TODO: add open hours column
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

export default function StickyHeadTable() {
  const { deleteFromHistory:destDelete, setDestination, rows} = useMapFeatures();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  

  const maxPage = Math.max(0, Math.ceil(rows.length / rowsPerPage) - 1);
  const pageClamped = Math.min(page, maxPage);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
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
                                aria-label={`show route ${row.desPlaceId}`}
                                onClick={() => setDestination(row.destObj)}
                              >
                                <RouteIcon fontSize="small"/>
                              </IconButton>
                              <IconButton
                                size="small"
                                aria-label={`delete ${row.desPlaceId}`}
                                onClick={() => destDelete(row.desPlaceId)}
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
