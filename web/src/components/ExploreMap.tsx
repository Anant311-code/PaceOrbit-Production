import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Place = {
  place_id: number;
  name: string;
  type: string;
  lat: string;
  lon: string;
  display_name: string;
};

type ExploreMapProps = {
  places: Place[];
  selectedPlaceId: number | null;
  onSelectPlace: (id: number) => void;
};

function MapController({
  places,
  selectedPlaceId,
}: {
  places: Place[];
  selectedPlaceId: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    const selected = places.find(
      (place) => place.place_id === selectedPlaceId
    );

    if (selected) {
      map.flyTo(
        [Number(selected.lat), Number(selected.lon)],
        16,
        { duration: 0.8 }
      );
      return;
    }

    const validPlaces = places.filter(
      (place) =>
        Number.isFinite(Number(place.lat)) &&
        Number.isFinite(Number(place.lon))
    );

    if (validPlaces.length === 1) {
      map.setView(
        [Number(validPlaces[0].lat), Number(validPlaces[0].lon)],
        14
      );
    } else if (validPlaces.length > 1) {
      map.fitBounds(
        validPlaces.map((place) => [
          Number(place.lat),
          Number(place.lon),
        ]),
        { padding: [40, 40], maxZoom: 14 }
      );
    }
  }, [places, selectedPlaceId, map]);

  return null;
}

export default function ExploreMap({
  places,
  selectedPlaceId,
  onSelectPlace,
}: ExploreMapProps) {
  const validPlaces = places.filter(
    (place) =>
      Number.isFinite(Number(place.lat)) &&
      Number.isFinite(Number(place.lon))
  );

  const firstPlace = validPlaces[0];

  if (!firstPlace) return null;

  return (
    <div className="po-interactive-map">
      <div className="po-map-heading">
        <div>
          <span className="po-map-eyebrow">EXPLORE THE AREA</span>
          <h3>Discover on the map</h3>
        </div>

        <span className="po-map-count">
          {validPlaces.length} locations
        </span>
      </div>

      <MapContainer
        center={[Number(firstPlace.lat), Number(firstPlace.lon)]}
        zoom={13}
        scrollWheelZoom={true}
        className="po-leaflet-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController
          places={validPlaces}
          selectedPlaceId={selectedPlaceId}
        />

        {validPlaces.map((place) => {
          const selected = place.place_id === selectedPlaceId;

          return (
            <CircleMarker
              key={place.place_id}
              center={[Number(place.lat), Number(place.lon)]}
              radius={selected ? 11 : 7}
              pathOptions={{
                color: selected ? "#F18A65" : "#302B43",
                fillColor: selected ? "#F18A65" : "#9180C5",
                fillOpacity: 0.9,
                weight: selected ? 4 : 2,
              }}
              eventHandlers={{
                click: () => onSelectPlace(place.place_id),
              }}
            >
              <Popup>
                <div className="po-map-popup">
                  <strong>{place.name}</strong>
                  <span>{place.type.replaceAll("_", " ")}</span>
                  <button
                    type="button"
                    onClick={() => onSelectPlace(place.place_id)}
                  >
                    Select this place
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="po-map-footer">
        <span>
          <i className="po-map-dot" />
          Select a marker to explore a place
        </span>
        <span>Map data © OpenStreetMap</span>
      </div>
    </div>
  );
}