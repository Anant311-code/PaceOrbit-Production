
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ExploreMap from "./ExploreMap";
import {
  Bike,
  Compass,
  Footprints,
  MapPin,
  Search,
  ExternalLink,
  Route,
  LoaderCircle,
  LocateFixed,
  Trees,
  SlidersHorizontal,
  Sparkles,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";
import "./ExplorePage.css";

type Category = "Running" | "Cycling" | "Walking";

type Place = {
  place_id: number;
  name: string;
  type: string;
  lat: string;
  lon: string;
  display_name: string;
};

const categoryConfig = {
  Running: {
    icon: Footprints,
    description: "Parks, greenways and open spaces to run",
  },
  Cycling: {
    icon: Bike,
    description: "Cycleways and cycling-friendly places",
  },
  Walking: {
    icon: Trees,
    description: "Parks, gardens and peaceful walks",
  },
};

const quickPlaces = [
  "Vapi, Gujarat",
  "Daman, India",
  "Surat, Gujarat",
  "Nashik, Maharashtra",
];

export default function ExplorePage() {
  const [category, setCategory] = useState<Category>("Running");
  const [location, setLocation] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [radius, setRadius] = useState("10");
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(
  null
);

  const CategoryIcon = categoryConfig[category].icon;

  const searchPlaces = async (queryOverride?: string) => {
    const place = (queryOverride ?? location).trim();

    if (!place) {
      setError("Enter a city, area or landmark.");
      return;
    }

    setLocation(place);
    setLoading(true);
    setError("");
    setSearched(true);
    setPlaces([]);
    setSelectedPlaceId(null);

    try {
      // Step 1: Find location coordinates
      const geocodeUrl =
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(place)}`;

      const geoResponse = await fetch(geocodeUrl, {
        headers: { Accept: "application/json" },
      });

      if (!geoResponse.ok) {
        throw new Error("Location search is temporarily unavailable.");
      }

      const geoData = await geoResponse.json();

      if (!geoData.length) {
        throw new Error("Location not found. Try another city or area.");
      }

      const { lat, lon } = geoData[0];
      const radiusMeters = Number(radius) * 1000;

      // Step 2: Search mapped outdoor places
      const query = `
        [out:json][timeout:25];
        (
          node["leisure"~"park|nature_reserve|garden"]
          (around:${radiusMeters},${lat},${lon});

          way["leisure"~"park|nature_reserve|garden"]
          (around:${radiusMeters},${lat},${lon});

          relation["leisure"~"park|nature_reserve|garden"]
          (around:${radiusMeters},${lat},${lon});

          way["highway"="cycleway"]
          (around:${radiusMeters},${lat},${lon});
        );
        out center tags 30;
      `;

      const response = await fetch(
        "https://overpass-api.de/api/interpreter",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/x-www-form-urlencoded;charset=UTF-8",
          },
          body: `data=${encodeURIComponent(query)}`,
        }
      );

      if (!response.ok) {
        throw new Error("Map service is busy. Please try again.");
      }

      const data = await response.json();

      const results: Place[] = (data.elements ?? [])
        .map((item: any) => ({
          place_id: item.id,
          name:
            item.tags?.name ||
            item.tags?.["name:en"] ||
            "Unnamed outdoor place",
          type:
            item.tags?.leisure ||
            item.tags?.highway ||
            "Outdoor place",
          lat: String(item.lat ?? item.center?.lat ?? ""),
          lon: String(item.lon ?? item.center?.lon ?? ""),
          display_name: [
            item.tags?.["addr:suburb"],
            item.tags?.["addr:city"],
            item.tags?.["addr:state"],
          ]
            .filter(Boolean)
            .join(", "),
        }))
        .filter((item: Place) => item.lat && item.lon)
        .filter(
          (item: Place, index: number, all: Place[]) =>
            all.findIndex(
              (other) => other.place_id === item.place_id
            ) === index
        )
        .slice(0, 24);

      setPlaces(results);

      if (!results.length) {
        setError(
          "No mapped places found. Try a larger radius or another location."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  };

  // Search using browser location permission
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported by this browser.");
      return;
    }

    setLoading(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`
          );

          const data = await response.json();

          const label =
            data.display_name
              ?.split(",")
              .slice(0, 3)
              .join(", ") ||
            `${coords.latitude}, ${coords.longitude}`;

          setLocation(label);
          setLoading(false);

          void searchPlaces(label);
        } catch {
          setLoading(false);
          setError("Unable to find your current area.");
        }
      },
      () => {
        setLoading(false);
        setError(
          "Location permission denied. Search by city instead."
        );
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  return (
    <div className="po-explore">
      {/* HERO SECTION */}

      <motion.section
        className="po-explore-hero"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <div className="po-explore-eyebrow">
            <Sparkles size={14} />
            FIND YOUR NEXT OUTDOOR ESCAPE
          </div>

          <h1>
            Adventure is
            <br />
            <em>closer than you think.</em>
          </h1>

          <p>
            Discover parks, paths and outdoor spaces around
            the places you love to move. Your next route starts here.
          </p>
        </div>

        <div className="po-explore-art">
          <div className="po-orbit">
            <div className="po-orbit-core">
              <Compass size={43} />
            </div>

            <div className="po-orbit-pin one">
              <MapPin size={19} />
            </div>

            <div className="po-orbit-pin two">
              <Bike size={19} />
            </div>

            <div className="po-orbit-pin three">
              <Footprints size={19} />
            </div>
          </div>
        </div>
      </motion.section>

      {/* SEARCH SECTION */}

      <section className="po-explore-search">
        <div className="po-explore-search-head">
          <strong>Where do you want to explore?</strong>
          <span>Search by city, area or landmark</span>
        </div>

        <form
          className="po-search-row"
          onSubmit={(event) => {
            event.preventDefault();
            void searchPlaces();
          }}
        >
          <label className="po-location-input">
            <MapPin size={18} />

            <input
              value={location}
              onChange={(event) =>
                setLocation(event.target.value)
              }
              placeholder="e.g. Vapi, Gujarat"
              aria-label="Search location"
            />
          </label>

          <button
            className="po-locate-btn"
            type="button"
            onClick={useMyLocation}
            title="Use my current location"
          >
            <LocateFixed size={18} />
          </button>

          <button
            className="po-search-btn"
            type="submit"
            disabled={loading}
          >
            <Search size={17} />
            Discover places
          </button>
        </form>

        <div className="po-quick-row">
          <span>POPULAR AREAS</span>

          {quickPlaces.map((place) => (
            <button
              key={place}
              type="button"
              onClick={() => void searchPlaces(place)}
            >
              {place}
            </button>
          ))}
        </div>

        {error && (
          <div className="po-error">
            <AlertCircle size={15} />
            {error}
          </div>
        )}
      </section>

      {/* CATEGORY FILTERS */}

      <div className="po-explore-controls">
        <div className="po-category-tabs">
          {(Object.keys(categoryConfig) as Category[]).map(
            (item) => {
              const Icon = categoryConfig[item].icon;

              return (
                <button
                  key={item}
                  type="button"
                  className={category === item ? "active" : ""}
                  onClick={() => {
                    setCategory(item);
                    setPlaces([]);
                    setSearched(false);
                    setError("");
                  }}
                >
                  <Icon size={17} />
                  {item}
                </button>
              );
            }
          )}
        </div>

        <label className="po-radius">
          <SlidersHorizontal size={15} />
          Radius

          <select
            value={radius}
            onChange={(event) => setRadius(event.target.value)}
          >
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="20">20 km</option>
            <option value="30">30 km</option>
          </select>
        </label>
      </div>

      {/* RESULTS */}

      <div className="po-results-heading">
        <div>
          <div className="po-explore-eyebrow">
            THE OUTDOORS, OPENED UP
          </div>

          <h2>
            {searched
              ? `Places around ${location.split(",")[0]}`
              : "Find a place to move"}
          </h2>

          <p>{categoryConfig[category].description}</p>
        </div>

        {places.length > 0 && (
          <span className="po-result-count">
            {places.length} places found
          </span>
        )}
      </div>
      {places.length > 0 && !loading && (
  <ExploreMap
    places={places}
    selectedPlaceId={selectedPlaceId}
    onSelectPlace={setSelectedPlaceId}
  />
)}

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            className="po-loading"
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoaderCircle className="po-spin" size={19} />
            Finding outdoor places around you...
          </motion.div>
        ) : places.length ? (
          <motion.div
            className="po-place-grid"
            key={`${category}-${location}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {places.map((place, index) => (
              <motion.article
  className={`po-place-card ${
    selectedPlaceId === place.place_id ? "po-place-card-selected" : ""
  }`}
  key={place.place_id}
  onClick={() => setSelectedPlaceId(place.place_id)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.025 }}
              >
                <div
                  className={`po-place-art ${category.toLowerCase()}`}
                >
                  <div className="po-place-art-icon">
                    <CategoryIcon size={22} />
                  </div>

                  <span className="po-place-art-label">
                    {category.toUpperCase()} DISCOVERY
                  </span>
                </div>

                <div className="po-place-body">
                  <div className="po-place-type">
                    {place.type.replaceAll("_", " ")}
                  </div>

                  <h3 title={place.name}>{place.name}</h3>

                  <div className="po-place-address">
                    {place.display_name ||
                      "Location details available on OpenStreetMap"}
                  </div>

                  <div className="po-place-actions">
                    <a
                      className="po-map-link"
                      href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=16/${place.lat}/${place.lon}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin size={14} />
                      View map
                      <ExternalLink size={12} />
                    </a>

                    <a
                      className="po-map-link"
                      href={`https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Directions
                      <ArrowUpRight size={13} />
                    </a>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        ) : (
          <motion.div
            className="po-empty"
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="po-empty-icon">
              <Route size={26} />
            </div>

            <h3>
              {searched
                ? "No places to show yet"
                : "Your next favourite place is out there."}
            </h3>

            <p>
              {searched
                ? "Try increasing the search radius, switching activity type, or searching another area."
                : "Choose Running, Cycling or Walking, then search a city or use your current location."}
            </p>

            {!searched && (
              <button
                type="button"
                className="po-search-btn"
                onClick={() =>
                  void searchPlaces("Vapi, Gujarat")
                }
              >
                Explore around Vapi
                <ArrowUpRight size={15} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="po-source-note">
        Place data © OpenStreetMap contributors ·
        Powered by OpenStreetMap and Overpass API
      </div>
    </div>
  );
}
