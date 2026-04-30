'use client';
import { useState, useRef, useEffect, Fragment } from 'react';
import { useMapFeatures } from "../context/MapContext";
import { PlacesAPI } from '../lib/AutoCompleteAPI';
import './NavPill.css';

const places = new PlacesAPI(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY);
const DELAY = 600; 
const INPUT_CHAR_MIN = 5;

const FIELDS = [
  { id: 'origin', label: 'Origin', placeholder: 'Where from?', icon: HomeIcon },
  { id: 'dest',   label: 'Destination', placeholder: 'Where to?', icon: DestIcon },
];

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(null);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = (e) => setIsMobile(e?.matches ?? mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, [breakpoint]);

  return isMobile;
}

function SuggestionList({ suggestions, onSelect, inOverlay = false }) {
  if (!suggestions.length) return null;
  return (
    <ul className={`np-dropdown ${inOverlay ? 'np-dropdown--overlay' : 'np-dropdown--floating'}`}>
      {suggestions.map((s) => (
        <li aria-label={s.placePrediction.placeId} key={s.placePrediction.placeId} className="np-dropdown__item" onMouseDown={() => onSelect(s)}>
          <span className="np-dropdown__pin">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5C5.51 1.5 3.5 3.51 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6c0-2.49-2.01-4.5-4.5-4.5zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="currentColor" />
            </svg>
          </span>
          <span className="np-dropdown__text">{s.placePrediction.text.text}</span>
        </li>
      ))}
      <li className="np-dropdown__attribution">Powered by Google</li>
    </ul>
  );
}

function HomeIcon() {
  return (
    <svg className="np-field__icon" width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M2 6.5L8 2l6 4.5V14a1 1 0 01-1 1H3a1 1 0 01-1-1V6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6 15v-5h4v5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function DestIcon() {
  return (
    <svg className="np-field__icon" width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M3 2v12M3 3l9 2.5L3 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// SIMPLIFIED: Changed onMouseDown to onClick, added type="button" to prevent form submits
function ClearButton({ visible, onClick }) {
  return (
    <button
      type="button"
      className={`np-field__clear ${visible ? 'np-field__clear--visible' : 'np-field__clear--hidden'}`}
      onClick={onClick}
      aria-label="Clear"
    >
      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
        <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

// SIMPLIFIED: Removed inputRef prop. Changed root element from <div> to <label>.
function PillField({ icon: Icon, label, value, placeholder, onChange, onFocus, onClear, active }) {
  return (
    <label className={`np-field ${active ? 'np-field--active' : ''}`} style={{ cursor: 'text' }}>
      <Icon />
      <div className="np-field__body">
        <span className="np-field__label">{label}</span>
        <input
          className="np-field__input"
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          placeholder={placeholder}
        />
      </div>
      {/* SIMPLIFIED: Removed e.stopPropagation(). Clicking clear bubbles to the label, which auto-focuses the input! */}
      <ClearButton visible={value.length > 0} onClick={onClear} />
    </label>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MobileOverlay — bottom-sheet-style search panel
   Replaces the old full-screen takeover with a card that slides up from
   the bottom. A drag handle at the top lets the user swipe down to dismiss
   (drag > 30% of sheet height → trigger onClose). Tapping the handle also
   closes the overlay.

   Touch gesture (swipe-to-dismiss):
     Non-passive touchmove listener on the handle zone lets us call
     preventDefault() and move the card with the finger. On touchend,
     if the card was dragged more than 30% of its visible height we
     close; otherwise we spring back to the open position.
───────────────────────────────────────────────────────────────────────────── */
function MobileOverlay({ field, input, suggestions, onClose, onChange, onSelect, onClear }) {
  const Icon      = field.icon;
  const cardRef   = useRef(null);
  const dragState = useRef({ startY: 0, startTop: 0, dragging: false });

  /* ── Swipe-to-dismiss: non-passive touch on handle zone ── */
  useEffect(() => {
    const handle = cardRef.current?.querySelector('[data-dismiss-handle]');
    if (!handle) return;

    function onStart(e) {
      dragState.current = {
        startY:   e.touches[0].clientY,
        startTop: 0,
        dragging: true,
      };
      const el = cardRef.current;
      if (el) el.style.transition = 'none';
    }

    function onMove(e) {
      e.preventDefault();
      if (!dragState.current.dragging) return;
      const delta = Math.max(0, e.touches[0].clientY - dragState.current.startY);
      const el = cardRef.current;
      if (el) el.style.transform = `translateY(${delta}px)`;
    }

    function onEnd(e) {
      dragState.current.dragging = false;
      const delta = Math.max(0, e.changedTouches[0].clientY - dragState.current.startY);
      const el    = cardRef.current;
      if (!el) return;

      const sheetHeight = el.getBoundingClientRect().height;
      if (delta > sheetHeight * 0.3) {
        /* Dragged more than 30% down → dismiss */
        el.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
        el.style.transform  = `translateY(100%)`;
        setTimeout(onClose, 280);
      } else {
        /* Spring back */
        el.style.transition = 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)';
        el.style.transform  = 'translateY(0)';
      }
    }

    handle.addEventListener('touchstart', onStart, { passive: true  });
    handle.addEventListener('touchmove',  onMove,  { passive: false });
    handle.addEventListener('touchend',   onEnd,   { passive: true  });
    return () => {
      handle.removeEventListener('touchstart', onStart);
      handle.removeEventListener('touchmove',  onMove);
      handle.removeEventListener('touchend',   onEnd);
    };
  }, [onClose]);

  return (
    <div className="np-mobile-overlay np-mobile-overlay--open" ref={cardRef}>

      {/* ── Drag handle — tap to close or swipe down to dismiss ── */}
      <div className="np-mobile-overlay__handle-zone" data-dismiss-handle onClick={onClose}>
        <div className="np-mobile-overlay__handle" />
      </div>

      {/* ── Search input row ── */}
      <label className="np-mobile-overlay__input-row" style={{ cursor: 'text' }}>
        <Icon />
        <input
          autoFocus
          className="np-mobile-overlay__input"
          value={input}
          onChange={onChange}
          placeholder={field.placeholder}
        />
        <ClearButton visible={input.length > 0} onClick={onClear} />
      </label>

      {/* ── Suggestions ── */}
      <div className="np-mobile-overlay__body">
        <SuggestionList suggestions={suggestions} onSelect={onSelect} inOverlay />
      </div>

    </div>
  );
}

export default function NavPill({ onSelect }) {
  const [fieldState, setFieldState] = useState({
    origin: { input: '', label: '' },
    dest:   { input: '', label: '' },
  });
  const [suggestions, setSuggestions] = useState([]);
  const [activeField, setActiveField] = useState(null);
  const [mobileOverlay, setMobileOverlay] = useState(null);

  const {
    handleHomeSelect, handleHomeClear,
    destination, addDestination, clearRoute,
    isStreetViewVisible,
    showDataTable, setShowDataTable
  } = useMapFeatures();

  const tableStateBeforeOverlay = useRef(null);

  // SIMPLIFIED: Kept pillRef (for click-outside), timer, and requestSeq. 
  // Deleted inputRefs, mobileInputRef, and tableStateBeforeOverlay!
  const pillRef = useRef(null);
  const timer = useRef(null);
  const requestSeq = useRef(0);
  
  const isMobile = useIsMobile();
  const shouldRenderMobile = isMobile === true;

  useEffect(() => {
    document.body.style.overflow = mobileOverlay ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOverlay]);

  useEffect(() => {
    const handler = (e) => {
      if (mobileOverlay) return;
      if (!pillRef.current?.contains(e.target)) {
        setActiveField(null);
        invalidateSuggestions();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [mobileOverlay]);

  function invalidateSuggestions() {
    clearTimeout(timer.current);
    requestSeq.current += 1;
    setSuggestions([]);
  }

  useEffect(() => {
    if (!destination) return;
    const label = destination.label ?? destination.name ?? '';
    setFieldState(prev => ({
      ...prev,
      dest: { input: label, label },
    }));
  }, [destination]);

  async function fetchSuggestions(value) {
    if (value.length < INPUT_CHAR_MIN) { invalidateSuggestions(); return; }
    const requestId = ++requestSeq.current;
    try {
      const results = await places.autocomplete(value);
      if (requestId === requestSeq.current) setSuggestions(results.slice(0, 5));
    } catch {
      if (requestId === requestSeq.current) setSuggestions([]);
    }
  }

  function handleChange(fieldId, value) {
    setFieldState(prev => ({ ...prev, [fieldId]: { ...prev[fieldId], input: value } }));
    clearTimeout(timer.current);
    if (value.length < INPUT_CHAR_MIN) { invalidateSuggestions(); return; }
    timer.current = setTimeout(() => fetchSuggestions(value), DELAY);
  }

  function handleActivate(fieldId, value) {
    setActiveField(fieldId);
    value.length >= 3 ? fetchSuggestions(value) : invalidateSuggestions();
  }

  function handleMobileOpen(fieldId, value) {
    // SIMPLIFIED: Removed manual table state toggling (handled by the new useEffect above)
    tableStateBeforeOverlay.current = showDataTable;
    setShowDataTable(false);

    setMobileOverlay(fieldId);
    value.length >= 3 ? fetchSuggestions(value) : invalidateSuggestions();

  }

  function closeOverlay() {
    setMobileOverlay(null);
    invalidateSuggestions();

    if (tableStateBeforeOverlay.current !== null) {
      setShowDataTable(tableStateBeforeOverlay.current);
    }
  }

  function handleSelect(suggestion) {
    const { placeId, text } = suggestion.placePrediction;
    const label = text.text;
    const fieldId = activeField ?? mobileOverlay;
    setFieldState(prev => ({ ...prev, [fieldId]: { input: label, label } }));
    invalidateSuggestions();
    setActiveField(null);
    closeOverlay();
    
    places.getGeocodeV3(placeId).then(({ location }) => {
      const place = {
        field: fieldId,
        label,
        placeId,
        lat: location.latitude,
        lng: location.longitude,
      };
      console.log(place);
      onSelect?.(place);

      if(fieldId === 'origin'){
        handleHomeSelect(place);
      } else {
        addDestination(place);
      }
    }).catch((err) => {
      console.error('Geocode failed:', err);
    });
  }

  function handleClear(fieldId) {
    setFieldState(prev => ({ ...prev, [fieldId]: { input: '', label: '' } }));
    invalidateSuggestions();

    if (fieldId === 'origin'){
      handleHomeClear();
    }else{
      clearRoute();
    }
    // SIMPLIFIED: Removed the setTimeout and manual ref.focus() calls here.
  }

  if (isStreetViewVisible) return null;
  if (isMobile === null) return null;

  if (!shouldRenderMobile) {
    return (
      <div ref={pillRef} className="np-pill-wrapper">
        <div className={`np-pill ${activeField ? 'np-pill--focused' : ''}`}>
          {FIELDS.map((f, i) => (
            <Fragment key={f.id}>
              {i > 0 && <div className="np-pill__divider" />}
              <PillField
                icon={f.icon}
                label={f.label}
                value={fieldState[f.id].input}
                placeholder={f.placeholder}
                active={activeField === f.id}
                onChange={e => handleChange(f.id, e.target.value)}
                onFocus={() => handleActivate(f.id, fieldState[f.id].input)}
                onClear={() => handleClear(f.id)}
              />
            </Fragment>
          ))}
        </div>
        {activeField && <SuggestionList suggestions={suggestions} onSelect={handleSelect} />}
      </div>
    );
  }

  const overlayField = FIELDS.find(f => f.id === mobileOverlay);

  return (
    <>
      <div ref={pillRef} className="np-pill np-pill--mobile">
        {FIELDS.map((f, i) => {
          const Icon = f.icon;
          return (
            <Fragment key={f.id}>
              {i > 0 && <div className="np-pill__divider np-pill__divider--horizontal" />}
              <div className="np-mobile-row" onClick={() => handleMobileOpen(f.id, fieldState[f.id].input)}>
                <Icon />
                <div className="np-mobile-row__body">
                  <span className="np-field__label">{f.label}</span>
                  <span className={`np-mobile-row__value ${!fieldState[f.id].label ? 'np-mobile-row__value--placeholder' : ''}`}>
                    {fieldState[f.id].label || f.placeholder}
                  </span>
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
      {mobileOverlay && overlayField && (
        <MobileOverlay
          field={overlayField}
          input={fieldState[mobileOverlay].input}
          suggestions={suggestions}
          onClose={closeOverlay}
          onChange={e => handleChange(mobileOverlay, e.target.value)}
          onSelect={handleSelect}
          onClear={() => handleClear(mobileOverlay)}
        />
      )}
    </>
  );
}