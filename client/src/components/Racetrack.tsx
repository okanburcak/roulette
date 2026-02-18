import { useCallback } from 'react';
import type { PlaceBetPayload, GamePhase, BetType } from '@shared/types';
import {
  WHEEL_ORDER, getNumberColor, getNeighbours,
  VOISINS_BETS, VOISINS_TOTAL_CHIPS, VOISINS_NUMBERS,
  TIERS_BETS, TIERS_TOTAL_CHIPS, TIERS_NUMBERS,
  ORPHELINS_BETS, ORPHELINS_TOTAL_CHIPS, ORPHELINS_NUMBERS,
} from '../constants/roulette';
import './Racetrack.css';

interface RacetrackProps {
  selectedChip: number;
  onPlaceBet: (payload: PlaceBetPayload) => void;
  phase: GamePhase;
  balance: number;
}

type SectionName = 'voisins' | 'tiers' | 'orphelins-a' | 'orphelins-b';

function getSection(num: number): SectionName | null {
  if (VOISINS_NUMBERS.includes(num)) return 'voisins';
  if (TIERS_NUMBERS.includes(num)) return 'tiers';
  if (ORPHELINS_NUMBERS.includes(num)) {
    // Orphelins split into two arcs on the wheel
    const idx = WHEEL_ORDER.indexOf(num);
    return idx < WHEEL_ORDER.indexOf(0) ? 'orphelins-b' : 'orphelins-a';
  }
  return null;
}

export default function Racetrack({ selectedChip, onPlaceBet, phase, balance }: RacetrackProps) {
  const disabled = phase !== 'betting';

  const placeSectionBets = useCallback((bets: { type: string; numbers: number[]; chips: number }[], totalChips: number) => {
    if (disabled) return;
    const cost = selectedChip * totalChips;
    if (cost > balance) return;

    for (const bet of bets) {
      onPlaceBet({
        type: bet.type as BetType,
        numbers: bet.numbers,
        amount: selectedChip * bet.chips,
      });
    }
  }, [disabled, selectedChip, balance, onPlaceBet]);

  const placeNeighboursBet = useCallback((num: number) => {
    if (disabled) return;
    const neighbours = getNeighbours(num, 2);
    const cost = selectedChip * neighbours.length;
    if (cost > balance) return;

    for (const n of neighbours) {
      onPlaceBet({
        type: 'straight',
        numbers: [n],
        amount: selectedChip,
      });
    }
  }, [disabled, selectedChip, balance, onPlaceBet]);

  return (
    <div className={`racetrack ${disabled ? 'disabled' : ''}`}>
      {/* Section buttons */}
      <div className="racetrack-sections">
        <button
          className="racetrack-section-btn voisins"
          onClick={() => placeSectionBets(VOISINS_BETS, VOISINS_TOTAL_CHIPS)}
          disabled={disabled || selectedChip * VOISINS_TOTAL_CHIPS > balance}
          title={`Voisins du Zero (${VOISINS_TOTAL_CHIPS} chips)`}
        >
          <span className="section-label">Voisins</span>
          <span className="section-cost">{VOISINS_TOTAL_CHIPS}x</span>
        </button>
        <button
          className="racetrack-section-btn tiers"
          onClick={() => placeSectionBets(TIERS_BETS, TIERS_TOTAL_CHIPS)}
          disabled={disabled || selectedChip * TIERS_TOTAL_CHIPS > balance}
          title={`Tiers du Cylindre (${TIERS_TOTAL_CHIPS} chips)`}
        >
          <span className="section-label">Tiers</span>
          <span className="section-cost">{TIERS_TOTAL_CHIPS}x</span>
        </button>
        <button
          className="racetrack-section-btn orphelins"
          onClick={() => placeSectionBets(ORPHELINS_BETS, ORPHELINS_TOTAL_CHIPS)}
          disabled={disabled || selectedChip * ORPHELINS_TOTAL_CHIPS > balance}
          title={`Orphelins (${ORPHELINS_TOTAL_CHIPS} chips)`}
        >
          <span className="section-label">Orphelins</span>
          <span className="section-cost">{ORPHELINS_TOTAL_CHIPS}x</span>
        </button>
      </div>

      {/* Oval track with numbers */}
      <div className="racetrack-track">
        {WHEEL_ORDER.map((num, idx) => {
          const color = getNumberColor(num);
          const section = getSection(num);
          return (
            <button
              key={idx}
              className={`racetrack-number ${color} ${section ?? ''}`}
              onClick={() => placeNeighboursBet(num)}
              disabled={disabled || selectedChip * 5 > balance}
              title={`${num} + 2 neighbours (5 chips)`}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
