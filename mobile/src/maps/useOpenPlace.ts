import { useRouter } from 'expo-router';
import { openInMaps } from '../places/openInMaps';
import { placeTapTarget } from './placeTap';
import type { Pin } from './pinRules';


export type OpenPlace = (place: string, pin: Pin | null | undefined, destination: string | null) => void;


export function useOpenPlace(): OpenPlace {
  const router = useRouter();

  return (place, pin, destination) => {
    const target = placeTapTarget(place, pin, destination);
    if (target === null) return;

    if (target.kind === 'maps') {
      openInMaps(target.url);
      return;
    }

    router.push({
      pathname: '/map',
      params: {
        place: target.place,
        lat: String(target.pin.lat),
        lng: String(target.pin.lng),
        zoom: String(target.pin.zoom),
        destination: destination ?? '',
      },
    });
  };
}
