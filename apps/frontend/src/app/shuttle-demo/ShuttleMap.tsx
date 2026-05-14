'use client';

import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from 'react-leaflet';
import L, { LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapStep {
  customerId: string;
  customerName: string;
  coordinates: [number, number]; // [lng, lat]
  arrivalTime: number;
  departureTime: number;
  distanceFromPrev: number;
}

export interface ShuttleMapProps {
  /** Tọa độ depot [lng, lat] */
  depot: [number, number];
  depotName: string;
  /** Tọa độ depot kết thúc [lng, lat]. Nếu không có thì dùng depot. */
  endDepot?: [number, number];
  endDepotName?: string;
  /** Các bước theo thứ tự thuật toán đã đề xuất */
  steps: MapStep[];
  /**
   * Polyline đường thật từ OSRM — mảng [lng, lat].
   * Nếu có, được dùng thay cho đường thẳng nối các marker.
   */
  routeGeometry?: [number, number][];
}

/** Chuyển phút từ 00:00 → "HH:MM" */
function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Tạo DivIcon tròn có số thứ tự bên trong */
function numberedIcon(label: string, color: string): L.DivIcon {
  return L.divIcon({
    className: 'shuttle-marker',
    html: `<div style="
      background:${color};
      color:#fff;
      width:32px;
      height:32px;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:700;
      font-size:13px;
      border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.35);
    ">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

/** Helper: auto-zoom để nhìn thấy tất cả marker */
function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, bounds]);
  return null;
}

export default function ShuttleMap({
  depot,
  depotName,
  endDepot,
  endDepotName,
  steps,
  routeGeometry,
}: ShuttleMapProps) {
  /** Toàn bộ điểm [lat, lng] — Leaflet dùng [lat, lng], không phải GeoJSON */
  const depotLatLng: LatLngExpression = useMemo(
    () => [depot[1], depot[0]],
    [depot],
  );
  const finalDepot = endDepot ?? depot;
  const finalDepotName = endDepotName ?? depotName;
  const endDepotLatLng: LatLngExpression = useMemo(
    () => [finalDepot[1], finalDepot[0]],
    [finalDepot],
  );
  const isOpenRoute = finalDepot[0] !== depot[0] || finalDepot[1] !== depot[1];

  /**
   * Ưu tiên polyline OSRM (đường thật) nếu có.
   * Fallback: đường thẳng nối depot → customers → depot kết thúc.
   */
  const routeLatLngs: LatLngExpression[] = useMemo(() => {
    if (routeGeometry && routeGeometry.length >= 2) {
      return routeGeometry.map(([lng, lat]) => [lat, lng] as LatLngExpression);
    }
    const path: LatLngExpression[] = [depotLatLng];
    steps.forEach((s) => path.push([s.coordinates[1], s.coordinates[0]]));
    path.push(endDepotLatLng);
    return path;
  }, [routeGeometry, depotLatLng, endDepotLatLng, steps]);

  const usingOsrm = Boolean(routeGeometry && routeGeometry.length >= 2);

  const bounds: LatLngBoundsExpression = useMemo(() => {
    const all: [number, number][] = [
      [depot[1], depot[0]],
      [finalDepot[1], finalDepot[0]],
      ...steps.map(
        (s) => [s.coordinates[1], s.coordinates[0]] as [number, number],
      ),
    ];
    return all;
  }, [depot, finalDepot, steps]);

  return (
    <MapContainer
      center={depotLatLng}
      zoom={12}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {/*
        Polyline đường đi:
          - Nếu có routeGeometry từ OSRM → curve uốn theo đường thật (màu xanh).
          - Nếu không → đường thẳng nối marker (màu cam cảnh báo).
      */}
      <Polyline
        positions={routeLatLngs}
        pathOptions={{
          color: usingOsrm ? '#1677ff' : '#fa8c16',
          weight: 4,
          opacity: 0.85,
          dashArray: usingOsrm ? undefined : '8, 6',
        }}
      />

      {/* Depot xuất phát */}
      <Marker
        position={depotLatLng}
        icon={numberedIcon(isOpenRoute ? 'S' : 'D', '#ef4444')}
      >
        <Popup>
          <strong>Depot xuất phát:</strong> {depotName}
        </Popup>
      </Marker>

      {isOpenRoute && (
        <Marker position={endDepotLatLng} icon={numberedIcon('E', '#dc2626')}>
          <Popup>
            <strong>Depot kết thúc:</strong> {finalDepotName}
          </Popup>
        </Marker>
      )}

      {/* Customer markers, đánh số theo thứ tự thuật toán đi */}
      {steps.map((s, idx) => (
        <Marker
          key={s.customerId}
          position={[s.coordinates[1], s.coordinates[0]]}
          icon={numberedIcon(String(idx + 1), '#2563eb')}
        >
          <Popup>
            <div style={{ minWidth: 180 }}>
              <strong>
                #{idx + 1} — {s.customerName}
              </strong>
              <br />
              Đến: <b>{minutesToHHMM(s.arrivalTime)}</b>
              <br />
              Đi tiếp: <b>{minutesToHHMM(s.departureTime)}</b>
              <br />
              Quãng trước đó: {s.distanceFromPrev.toFixed(2)} km
            </div>
          </Popup>
        </Marker>
      ))}

      <FitBounds bounds={bounds} />
    </MapContainer>
  );
}
