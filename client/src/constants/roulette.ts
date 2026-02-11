export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
export const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
  11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
  22, 18, 29, 7, 28, 12, 35, 3, 26
];

export function getNumberColor(n: number): 'red' | 'black' | 'green' {
  if (n === 0) return 'green';
  return RED_NUMBERS.includes(n) ? 'red' : 'black';
}

export const TABLE_ROWS = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

export const DOZENS: Record<string, number[]> = {
  '1st12': Array.from({ length: 12 }, (_, i) => i + 1),
  '2nd12': Array.from({ length: 12 }, (_, i) => i + 13),
  '3rd12': Array.from({ length: 12 }, (_, i) => i + 25),
};

export const COLUMNS: Record<string, number[]> = {
  'col1': [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  'col2': [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  'col3': [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
};

export const CHIP_DENOMINATIONS = [
  { value: 1, color: '#ffffff', label: '1' },
  { value: 5, color: '#e74c3c', label: '5' },
  { value: 10, color: '#3498db', label: '10' },
  { value: 25, color: '#2ecc71', label: '25' },
  { value: 100, color: '#1a1a2e', label: '100' },
];

export function getStreet(n: number): number[] {
  if (n === 0) return [0];
  const base = Math.ceil(n / 3) * 3 - 2;
  return [base, base + 1, base + 2];
}
