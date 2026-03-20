import "./MapWithBox.css";
import { useMapFeatures } from "../context/MapContext"
import ListIcon from '@mui/icons-material/List';
import "./MapWithBox.css";

export default function ShowDataTableButton() {
  const {isStreetViewVisible, showDataTable, setShowDataTable} = useMapFeatures();

  if (isStreetViewVisible) return null;

  return (
    <button
      type="button"
      className="nav-buttons show-data-table-button"
      aria-label="hide/unhide datatable"
      onClick={() => {
        setShowDataTable(prev => !prev)
      }}
    >
      <ListIcon className="nav-icons" />
    </button>
  )


}
