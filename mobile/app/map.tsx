import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapViewerScreen } from '../src/maps/MapViewerScreen';
import { isValidPin } from '../src/maps/pinRules';


export default function MapViewerRoute() {
  const router = useRouter();
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
      zoom={pin.zoom}
      destination={destination === undefined || destination === '' ? null : destination}
      onClose={() => router.back()}
    />
  );
}
