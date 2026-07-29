


export function addDestination(destinations: string[]): string[] {
  return [...destinations, ''];
}


export function removeDestination(destinations: string[], index: number): string[] {
  return destinations.filter((_, i) => i !== index);
}


export function setDestination(destinations: string[], index: number, value: string): string[] {
  return destinations.map((d, i) => (i === index ? value : d));
}


export function cleanDestinations(destinations: string[]): string[] {
  return destinations.map((d) => d.trim()).filter((d) => d !== '');
}
