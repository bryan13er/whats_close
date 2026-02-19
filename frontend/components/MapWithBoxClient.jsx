"use client";

import dynamic from "next/dynamic";

const MapWithBox = dynamic(() => import("./MapWithBox"), {
  ssr: false,
});

export default function MapWithBoxClient() {
  return <MapWithBox />;
}
