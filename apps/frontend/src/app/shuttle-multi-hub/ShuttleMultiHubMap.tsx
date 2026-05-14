'use client';

import { Fragment, useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from 'react-leaflet';
import L, { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Tọa độ 2 bến xe đầu cuối tuyến chính TPHCM.
 * Tuyến chính: BXMT → BXMĐ → ra Hà Nội.
 */
export const HUB_BXMT: [number, number] = [106.6232, 10.7411]; // Bến Xe Miền Tây
export const HUB_BXMD: [number, number] = [106.815484, 10.880216]; // Bến Xe Miền Đông

export interface MapStep {
  customerId: string;
  customerName: string;
  coordinates: [number, number];
  arrivalTime: number;
  departureTime: number;
  distanceFromPrev: number;
}

/**
 * 1 nhánh shuttle = 1 depot (BXMT hoặc BXMĐ) + 1 list khách.
 */
export interface ShuttleBranch {
  depot: [number, number];
  depotName: string;
  endDepot?: [number, number];
  endDepotName?: string;
  vehicleName?: string;
  steps: MapStep[];
  /** Polyline đường thật từ OSRM nếu có. */
  routeGeometry?: [number, number][];
  /** Màu cho polyline + marker — phân biệt giữa các shuttle */
  color: string;
}

export interface ShuttleMultiHubMapProps {
  /** Tối đa 2 shuttle (1 cho BXMT, 1 cho BXMĐ). Có thể rỗng. */
  branches: ShuttleBranch[];
}

/** Tạo DivIcon tròn có label */
function numberedIcon(label: string, color: string): L.DivIcon {
  return L.divIcon({
    className: 'shuttle-marker',
    html: `<div style="
      background:${color};
      color:#fff;
      width:30px;
      height:30px;
      border-radius:50%;
      display:flex;
      align-items:center;
      justify-content:center;
      font-weight:700;
      font-size:12px;
      border:2px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.35);
    ">${label}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [map, bounds]);
  return null;
}

export default function ShuttleMultiHubMap({
  branches,
}: ShuttleMultiHubMapProps) {
  const bxmtLatLng: LatLngExpression = [HUB_BXMT[1], HUB_BXMT[0]];
  const bxmdLatLng: LatLngExpression = [HUB_BXMD[1], HUB_BXMD[0]];

  /** Red dashed line: tuyến xe khách chính BXMT ↔ BXMĐ */
  const mainRouteLatLngs: LatLngExpression[] = useMemo(
    () => [bxmtLatLng, bxmdLatLng],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /** Auto-fit bounds: bao gồm cả 2 hub + tất cả customer trong các branch */
  const bounds: LatLngBoundsExpression = useMemo(() => {
    const points: [number, number][] = [
      [HUB_BXMT[1], HUB_BXMT[0]],
      [HUB_BXMD[1], HUB_BXMD[0]],
    ];
    branches.forEach((br) => {
      const endDepot = br.endDepot ?? br.depot;
      points.push([endDepot[1], endDepot[0]]);
      br.steps.forEach((s) =>
        points.push([s.coordinates[1], s.coordinates[0]]),
      );
    });
    return points;
  }, [branches]);

  return (
    <MapContainer
      center={[
        (HUB_BXMT[1] + HUB_BXMD[1]) / 2,
        (HUB_BXMT[0] + HUB_BXMD[0]) / 2,
      ]}
      zoom={11}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {/* ─── RED LINE: tuyến xe khách chính BXMT ↔ BXMĐ ─── */}
      <Polyline
        positions={mainRouteLatLngs}
        pathOptions={{
          color: '#dc2626',
          weight: 5,
          opacity: 0.9,
          dashArray: '12, 8',
        }}
      >
        <Popup>
          <strong>Tuyến chính</strong>
          <br />
          Bến Xe Miền Tây ↔ Bến Xe Miền Đông
          <br />
          (xe khách → Hà Nội)
        </Popup>
      </Polyline>

      {/* ─── 2 Hub markers ─── */}
      <Marker position={bxmtLatLng} icon={numberedIcon('T', '#dc2626')}>
        <Popup>
          <strong>Bến Xe Miền Tây</strong>
        </Popup>
      </Marker>
      <Marker position={bxmdLatLng} icon={numberedIcon('Đ', '#dc2626')}>
        <Popup>
          <strong>Bến Xe Miền Đông</strong>
        </Popup>
      </Marker>

      {/* ─── Mỗi branch: shuttle polyline + customer markers ─── */}
      {branches.map((br, branchIdx) => {
        const depotLatLng: LatLngExpression = [br.depot[1], br.depot[0]];
        const endDepot = br.endDepot ?? br.depot;
        const endDepotLatLng: LatLngExpression = [
          endDepot[1],
          endDepot[0],
        ];
        const isOpenRoute =
          endDepot[0] !== br.depot[0] || endDepot[1] !== br.depot[1];
        const shuttleLatLngs: LatLngExpression[] =
          br.routeGeometry && br.routeGeometry.length >= 2
            ? br.routeGeometry.map(
                ([lng, lat]) => [lat, lng] as LatLngExpression,
              )
            : (() => {
                const path: LatLngExpression[] = [depotLatLng];
                br.steps.forEach((s) =>
                  path.push([s.coordinates[1], s.coordinates[0]]),
                );
                path.push(endDepotLatLng);
                return path;
              })();

        return (
          <Fragment key={`branch-${branchIdx}`}>
            {/* Shuttle polyline */}
            <Polyline
              positions={shuttleLatLngs}
              pathOptions={{
                color: br.color,
                weight: 4,
                opacity: 0.85,
              }}
            />
            {isOpenRoute && (
              <Marker
                position={endDepotLatLng}
                icon={numberedIcon('E', br.color)}
              >
                <Popup>
                  <strong>{br.endDepotName ?? 'Depot kết thúc'}</strong>
                </Popup>
              </Marker>
            )}
            {/* Customer markers — đánh số theo thứ tự đón */}
            {br.steps.map((s, idx) => (
              <Marker
                key={`b${branchIdx}-c${idx}`}
                position={[s.coordinates[1], s.coordinates[0]]}
                icon={numberedIcon(String(idx + 1), br.color)}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <strong>
                      [{br.vehicleName ?? br.depotName}] #{idx + 1} —{' '}
                      {s.customerName}
                    </strong>
                    <br />
                    Đến: <b>{minutesToHHMM(s.arrivalTime)}</b>
                    <br />
                    Đi tiếp: <b>{minutesToHHMM(s.departureTime)}</b>
                    <br />
                    Quãng trước: {s.distanceFromPrev.toFixed(2)} km
                  </div>
                </Popup>
              </Marker>
            ))}
          </Fragment>
        );
      })}

      <FitBounds bounds={bounds} />
    </MapContainer>
  );
}

function minutesToHHMM(min: number): string {
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
