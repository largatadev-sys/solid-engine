import { addRow, cleanRows, removeRow, setRow } from './rowEditor';


export function addDestination(destinations: string[]): string[] {
  return addRow(destinations);
}


export function removeDestination(destinations: string[], index: number): string[] {
  return removeRow(destinations, index);
}


export function setDestination(destinations: string[], index: number, value: string): string[] {
  return setRow(destinations, index, value);
}


export function cleanDestinations(destinations: string[]): string[] {
  return cleanRows(destinations);
}
