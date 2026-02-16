"use client";

import { useState } from "react";
import styles from "./DestinationOverlay.module.css";

const destinations = [
  { id: 1, name: "Supercharger — Monterey", distance: "22 mi" },
  { id: 2, name: "Supercharger — Santa Cruz", distance: "38 mi" },
  { id: 3, name: "Supercharger — San Jose", distance: "61 mi" },
  { id: 4, name: "Grocery Store", distance: "4 mi" },
  { id: 5, name: "Home", distance: "0 mi" },
];

const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg
    className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
    viewBox="0 0 24 24" width="16" height="16"
    fill="none" stroke="currentColor" strokeWidth="2.5"
    strokeLinecap="round" strokeLinejoin="round"
  >
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

export default function DestinationOverlay({ onSelect }) {
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(true);

  const handleSelect = (dest) => {
    setSelected(dest);
    setOpen(false);
    onSelect?.(dest); // pass destination up to parent / map
  };

  const handleClear = () => {
    setSelected(null);
    setOpen(true);
    onSelect?.(null);
  };

  if (selected) {
    return (
      <div className={styles.chip}>
        <span className={styles.chipDot} />
        <span className={styles.chipName}>{selected.name}</span>
        <span className={styles.chipDist}>{selected.distance}</span>
        <button className={styles.chipClose} onClick={handleClear} aria-label="Clear destination">
          ×
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.panel} ${open ? "" : styles.panelCollapsed}`}>
      <div
        className={styles.panelHeader}
        onClick={() => setOpen((o) => !o)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className={styles.panelTitle}>Where to?</span>
        <ChevronIcon open={open} />
      </div>

      <div className={styles.listWrapper}>
        {destinations.map((dest, i) => (
          <button
            key={dest.id}
            className={`${styles.destRow} ${i < destinations.length - 1 ? styles.destRowBorder : ""}`}
            onClick={() => handleSelect(dest)}
          >
            <span className={styles.destIcon}>
              <PinIcon />
            </span>
            <span className={styles.destName}>{dest.name}</span>
            <span className={styles.destDist}>{dest.distance}</span>
          </button>
        ))}
      </div>
    </div>
  );
}