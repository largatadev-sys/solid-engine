export function addRow(rows: string[]): string[] {
  return [...rows, ''];
}


export function removeRow(rows: string[], index: number): string[] {
  return rows.filter((_, i) => i !== index);
}


export function setRow(rows: string[], index: number, value: string): string[] {
  return rows.map((row, i) => (i === index ? value : row));
}


export function moveRow(rows: string[], index: number, by: -1 | 1): string[] {
  const target = index + by;
  if (target < 0 || target >= rows.length) return rows;

  const moved = [...rows];
  const [row] = moved.splice(index, 1);
  moved.splice(target, 0, row as string);
  return moved;
}


export function cleanRows(rows: string[]): string[] {
  return rows.map((row) => row.trim()).filter((row) => row !== '');
}
