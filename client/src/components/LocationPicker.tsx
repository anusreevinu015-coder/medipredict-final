import { useEffect, useState } from 'react';
import { locationApi, nearestLocation } from '../api/location';
import type { ServiceLocation } from '../types/hospital';

const STORAGE_KEY = 'medipredict.selectedLocation';

export function readStoredLocation(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'all';
  } catch {
    return 'all';
  }
}

export function writeStoredLocation(city: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, city);
  } catch {
    // Storage can be unavailable in private browsing — the picker still works.
  }
}

interface LocationPickerProps {
  value: string;
  onChange: (city: string) => void;
  disabled?: boolean;
}

/**
 * Patient location step: pick one of the eight service locations manually, or
 * use device geolocation to select the nearest city. The choice is persisted
 * so later steps (appointment booking) can prefill the same city.
 */
export function LocationPicker({ value, onChange, disabled = false }: LocationPickerProps) {
  const [locations, setLocations] = useState<ServiceLocation[]>([]);
  const [geoState, setGeoState] = useState<'idle' | 'locating' | 'denied' | 'failed'>('idle');

  useEffect(() => {
    let cancelled = false;
    locationApi
      .list()
      .then((result) => {
        if (!cancelled) setLocations(result.locations);
      })
      .catch(() => {
        // The city select stays usable with the value already chosen.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoState('failed');
      return;
    }
    setGeoState('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = nearestLocation(
          locations,
          position.coords.latitude,
          position.coords.longitude,
        );
        if (nearest) {
          setGeoState('idle');
          writeStoredLocation(nearest.city);
          onChange(nearest.city);
        } else {
          setGeoState('failed');
        }
      },
      (error) => {
        setGeoState(error.code === error.PERMISSION_DENIED ? 'denied' : 'failed');
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  };

  return (
    <div className="hosp-filter location-picker">
      <label htmlFor="hosp-city">
        Your location (Tamil Nadu)
        <select
          id="hosp-city"
          value={value}
          onChange={(e) => {
            writeStoredLocation(e.target.value);
            onChange(e.target.value);
          }}
          disabled={disabled || locations.length === 0}
          data-testid="hospital-city"
        >
          <option value="all">All locations</option>
          {locations.map((location) => (
            <option key={location.id} value={location.city}>
              {location.city} ({location.district} District)
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="btn btn-outline location-geo-btn"
        onClick={useMyLocation}
        disabled={disabled || geoState === 'locating' || locations.length === 0}
        data-testid="use-location"
      >
        {geoState === 'locating' ? 'Locating…' : 'Use my location'}
      </button>
      {geoState === 'denied' && (
        <span className="muted location-geo-msg" role="status">
          Location access denied — choose your city from the list.
        </span>
      )}
      {geoState === 'failed' && (
        <span className="muted location-geo-msg" role="status">
          Could not detect your location — choose your city from the list.
        </span>
      )}
    </div>
  );
}
