"use client";

import { useEffect, useRef } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import "./Autocomplete.css";

async function extractSelectedLocation(event) {
  const directPlace = event.place || event.detail?.place;
  if (directPlace?.location) {
    return {
      lat: directPlace.location.lat(),
      lng: directPlace.location.lng(),
      name: directPlace.displayName || "",
    };
  }

  const prediction = event.placePrediction || event.detail?.placePrediction;
  if (!prediction?.toPlace) return null;

  const place = prediction.toPlace();
  await place.fetchFields({ fields: ["location", "displayName"] });
  if (!place?.location) return null;

  return {
    lat: place.location.lat(),
    lng: place.location.lng(),
    name: place.displayName || "",
  };
}

export default function Autocomplete({ onPlaceSelect }) {
  const containerRef = useRef(null);
  const placesLib = useMapsLibrary("places");

  useEffect(() => {
    if (!placesLib || !containerRef.current) return;

    const autocompleteElement = new placesLib.PlaceAutocompleteElement();
    autocompleteElement.className = "modern-search-element";

    const handleSelect = async (event) => {
      const location = await extractSelectedLocation(event);
      if (location) onPlaceSelect?.(location);
    };

    autocompleteElement.addEventListener("gmp-select", handleSelect);
    autocompleteElement.addEventListener("gmp-placeselect", handleSelect);
    containerRef.current.replaceChildren(autocompleteElement);

    return () => {
      autocompleteElement.removeEventListener("gmp-select", handleSelect);
      autocompleteElement.removeEventListener("gmp-placeselect", handleSelect);
      if (containerRef.current) containerRef.current.replaceChildren();
    };
  }, [placesLib, onPlaceSelect]);

  return <div ref={containerRef} className="search-container" />;
}
