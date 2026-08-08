import { Redirect, useLocalSearchParams } from 'expo-router';


export default function RetiredDayViewRoute() {
  const { id } = useLocalSearchParams<{ id: string; dayId: string }>();

  return <Redirect href={{ pathname: '/itineraries/[id]', params: { id } }} />;
}
