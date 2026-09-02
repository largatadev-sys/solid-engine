import { useLocalSearchParams } from 'expo-router';
import { MapViewerScreen } from '../src/maps/MapViewerScreen';
import { isValidPin } from '../src/maps/pinRules';


export default function MapViewerRoute() {
  const { place, lat, lng, zoom, destination } = useLocalSearchParams<{
    place: string;
    lat: string;
    lng: string;
    zoom: string;
    destination?: string;
  }>();

  const pin = { lat: Number(lat), lng: Number(lng), zoom: Number(zoom) };
  if (!isValidPin(pin)) return null;

  return (
    <MapViewerScreen
      place={place ?? ''}
      pin={pin}
      destination={destination === undefined || destination === '' ? null : destination}
    />
  );
}
