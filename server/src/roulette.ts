import crypto from 'crypto';
import type { BetType } from '../../shared/types.js';

export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
  11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
  22, 18, 29, 7, 28, 12, 35, 3, 26
];

export const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
export const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

export const PAYOUT_MULTIPLIERS: Record<BetType, number> = {
  straight: 35,
  split: 17,
  street: 11,
  corner: 8,
  sixline: 5,
  dozen: 2,
  column: 2,
  red: 1,
  black: 1,
  odd: 1,
  even: 1,
  low: 1,
  high: 1,
};

const EXPECTED_NUMBERS_COUNT: Record<BetType, number> = {
  straight: 1,
  split: 2,
  street: 3,
  corner: 4,
  sixline: 6,
  dozen: 12,
  column: 12,
  red: 18,
  black: 18,
  odd: 18,
  even: 18,
  low: 18,
  high: 18,
};

export function spin(): number {
  return crypto.randomInt(0, 37);
}

export function isRed(n: number): boolean {
  return RED_NUMBERS.includes(n);
}

export function isBlack(n: number): boolean {
  return BLACK_NUMBERS.includes(n);
}

export function validateBet(type: BetType, numbers: number[], amount: number): string | null {
  if (amount < 1) return 'Minimum bet is 1 chip';
  if (amount > 500) return 'Maximum bet is 500 chips per position';

  for (const n of numbers) {
    if (n < 0 || n > 36 || !Number.isInteger(n)) {
      return `Invalid number: ${n}`;
    }
  }

  const expected = EXPECTED_NUMBERS_COUNT[type];
  if (!expected) return `Invalid bet type: ${type}`;
  if (numbers.length !== expected) {
    return `${type} bet requires exactly ${expected} numbers, got ${numbers.length}`;
  }

  return null;
}

export function doesBetWin(type: BetType, numbers: number[], winningNumber: number): boolean {
  return numbers.includes(winningNumber);
}

export function calculatePayout(type: BetType, amount: number): number {
  return amount * PAYOUT_MULTIPLIERS[type] + amount;
}
