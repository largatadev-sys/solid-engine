import { Redirect, useLocalSearchParams } from 'expo-router';


export default function RetiredPlannerRoute() {
  const { id, day } = useLocalSearchParams<{ id: string; day?: string }>();

  return (
    <Redirect
      href={{
        pathname: '/itineraries/[id]',
        params: day === undefined ? { id } : { id, day },
      }}
    />
  );
}
