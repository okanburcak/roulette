import { useCallback, useMemo } from 'react';
import type { PlaceBetPayload, Player, GamePhase, Bet, BetType } from '@shared/types';
import { TABLE_ROWS, DOZENS, COLUMNS, getNumberColor } from '../constants/roulette';
import './BettingTable.css';

interface BettingTableProps {
  selectedChip: number;
  onPlaceBet: (payload: PlaceBetPayload) => void;
  players: Player[];
  myId: string;
  phase: GamePhase;
  winningNumber: number | null;
}

/* ------------------------------------------------------------------ */
/*  Constants for grid geometry                                        */
/* ------------------------------------------------------------------ */
const CELL_W = 50;   // px – width of one number cell
const CELL_H = 45;   // px – height of one number cell
const OVERLAY = 12;  // px – width / height of overlay hit zones
const BORDER = 1;    // px – border width between cells

// The zero cell occupies grid column 1.  Number cells start at grid column 2.
// In pixel terms, the number area starts at x = CELL_W (after the zero column).
const NUM_ORIGIN_X = CELL_W + BORDER; // left edge of the first number column
const NUM_ORIGIN_Y = 0;               // top edge of the first number row

/** Map a number (1-36) to its {col, row} in the TABLE_ROWS layout. */
function numberToGridPos(n: number): { col: number; row: number } {
  for (let r = 0; r < TABLE_ROWS.length; r++) {
    const c = TABLE_ROWS[r].indexOf(n);
    if (c !== -1) return { col: c, row: r };
  }
  return { col: 0, row: 0 };
}

/** Pixel coordinates of the top-left corner of a number cell (1-36) in the
 *  overlay coordinate system (relative to the grid container). */
function cellPixel(n: number): { x: number; y: number } {
  const { col, row } = numberToGridPos(n);
  return {
    x: NUM_ORIGIN_X + col * (CELL_W + BORDER),
    y: NUM_ORIGIN_Y + row * (CELL_H + BORDER),
  };
}

/* ------------------------------------------------------------------ */
/*  Build a stable key from a sorted numbers array                     */
/* ------------------------------------------------------------------ */
function betKey(type: BetType, numbers: number[]): string {
  return `${type}:${[...numbers].sort((a, b) => a - b).join(',')}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function BettingTable({
  selectedChip,
  onPlaceBet,
  players,
  myId: _myId,
  phase,
  winningNumber,
}: BettingTableProps) {
  const isBetting = phase === 'betting';

  /* ---------- helpers to place bets -------------------------------- */
  const place = useCallback(
    (type: BetType, numbers: number[]) => {
      if (!isBetting) return;
      onPlaceBet({ type, numbers, amount: selectedChip });
    },
    [isBetting, onPlaceBet, selectedChip],
  );

  /* ---------- collect all bets from all players -------------------- */
  const allBets = useMemo(() => {
    const map = new Map<string, { bet: Bet; player: Player }[]>();
    for (const p of players) {
      for (const b of p.bets) {
        const k = betKey(b.type, b.numbers);
        let arr = map.get(k);
        if (!arr) {
          arr = [];
          map.set(k, arr);
        }
        arr.push({ bet: b, player: p });
      }
    }
    return map;
  }, [players]);

  /* ---------- render chips stacked on a position ------------------- */
  const renderChips = (
    type: BetType,
    numbers: number[],
    style?: React.CSSProperties,
    asOverlay?: boolean,
  ) => {
    const k = betKey(type, numbers);
    const entries = allBets.get(k);
    if (!entries || entries.length === 0) return null;

    const cls = asOverlay ? 'bt-overlay-chip-stack' : 'bt-chip-stack';
    return (
      <span className={cls} style={style}>
        {entries.map((e, i) => (
          <span
            key={e.bet.id}
            className="bt-placed-chip"
            style={{
              backgroundColor: e.player.chipColor,
              top: `${i * -4}px`,
              left: `${i * 3}px`,
            }}
          >
            {e.bet.amount}
          </span>
        ))}
      </span>
    );
  };

  /* ================================================================ */
  /*  Overlay zones                                                    */
  /* ================================================================ */

  const overlayZones = useMemo(() => {
    const zones: React.ReactNode[] = [];
    let idx = 0;

    /* ---- Horizontal splits (between vertically adjacent numbers) ---- */
    // Adjacent rows: row0-row1, row1-row2
    for (let rowPair = 0; rowPair < 2; rowPair++) {
      for (let col = 0; col < 12; col++) {
        const top = TABLE_ROWS[rowPair][col];
        const bot = TABLE_ROWS[rowPair + 1][col];
        const nums = [Math.min(top, bot), Math.max(top, bot)];
        const { x } = cellPixel(top);
        const yEdge =
          NUM_ORIGIN_Y + (rowPair + 1) * (CELL_H + BORDER) - OVERLAY / 2;
        zones.push(
          <div
            key={`hsplit-${idx++}`}
            className="bt-overlay-zone"
            style={{
              left: x + OVERLAY / 2,
              top: yEdge,
              width: CELL_W - OVERLAY,
              height: OVERLAY,
            }}
            onClick={() => place('split', nums)}
          />,
        );
      }
    }

    /* ---- Vertical splits (between horizontally adjacent numbers) ---- */
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 11; col++) {
        const left = TABLE_ROWS[row][col];
        const right = TABLE_ROWS[row][col + 1];
        const nums = [Math.min(left, right), Math.max(left, right)];
        const xEdge =
          NUM_ORIGIN_X + (col + 1) * (CELL_W + BORDER) - OVERLAY / 2;
        const { y } = cellPixel(left);
        zones.push(
          <div
            key={`vsplit-${idx++}`}
            className="bt-overlay-zone"
            style={{
              left: xEdge,
              top: y + OVERLAY / 2,
              width: OVERLAY,
              height: CELL_H - OVERLAY,
            }}
            onClick={() => place('split', nums)}
          />,
        );
      }
    }

    /* ---- Corner zones (intersection of 4 cells) ---- */
    for (let rowPair = 0; rowPair < 2; rowPair++) {
      for (let col = 0; col < 11; col++) {
        const tl = TABLE_ROWS[rowPair][col];
        const tr = TABLE_ROWS[rowPair][col + 1];
        const bl = TABLE_ROWS[rowPair + 1][col];
        const br = TABLE_ROWS[rowPair + 1][col + 1];
        const nums = [tl, tr, bl, br].sort((a, b) => a - b);
        const xEdge =
          NUM_ORIGIN_X + (col + 1) * (CELL_W + BORDER) - OVERLAY / 2;
        const yEdge =
          NUM_ORIGIN_Y + (rowPair + 1) * (CELL_H + BORDER) - OVERLAY / 2;
        zones.push(
          <div
            key={`corner-${idx++}`}
            className="bt-overlay-zone"
            style={{
              left: xEdge,
              top: yEdge,
              width: OVERLAY,
              height: OVERLAY,
            }}
            onClick={() => place('corner', nums)}
          />,
        );
      }
    }

    /* ---- Street zones (left edge of each group of 3) ---- */
    // A street is a column of the table (3 numbers stacked).
    // Clickable area: small strip on the LEFT edge of the bottom-row cell.
    for (let col = 0; col < 12; col++) {
      const base = TABLE_ROWS[2][col]; // bottom number of the column
      const nums = [base, base + 1, base + 2];
      const { x } = cellPixel(base);
      const { y } = cellPixel(base);
      zones.push(
        <div
          key={`street-${idx++}`}
          className="bt-overlay-zone bt-street-zone"
          style={{
            left: x - OVERLAY / 2,
            top: y + OVERLAY / 2,
            width: OVERLAY,
            height: CELL_H - OVERLAY,
          }}
          onClick={() => place('street', nums)}
        />,
      );
    }

    /* ---- Sixline zones (intersection of two adjacent streets at left edge) ---- */
    // Clickable at the bottom-left corner between two horizontally adjacent table columns
    for (let col = 0; col < 11; col++) {
      const base1 = TABLE_ROWS[2][col];
      const base2 = TABLE_ROWS[2][col + 1];
      const nums = [
        base1, base1 + 1, base1 + 2,
        base2, base2 + 1, base2 + 2,
      ].sort((a, b) => a - b);
      const xEdge =
        NUM_ORIGIN_X + (col + 1) * (CELL_W + BORDER) - OVERLAY / 2;
      const yBot = NUM_ORIGIN_Y + 3 * (CELL_H + BORDER) - OVERLAY / 2;
      zones.push(
        <div
          key={`sixline-${idx++}`}
          className="bt-overlay-zone bt-sixline-zone"
          style={{
            left: xEdge,
            top: yBot,
            width: OVERLAY,
            height: OVERLAY,
          }}
          onClick={() => place('sixline', nums)}
        />,
      );
    }

    /* ---- Split with zero: 0-1, 0-2, 0-3 ---- */
    // These are on the right edge of the zero cell bordering row 3, row 2, row 1.
    const zeroSplits: [number, number][] = [
      [0, 3],  // top of zero adjacent to 3
      [0, 2],  // middle of zero adjacent to 2
      [0, 1],  // bottom of zero adjacent to 1
    ];
    for (let i = 0; i < zeroSplits.length; i++) {
      const nums = zeroSplits[i];
      zones.push(
        <div
          key={`zsplit-${idx++}`}
          className="bt-overlay-zone"
          style={{
            left: CELL_W + BORDER - OVERLAY / 2,
            top: i * (CELL_H + BORDER) + OVERLAY / 2,
            width: OVERLAY,
            height: CELL_H - OVERLAY,
          }}
          onClick={() => place('split', [...nums])}
        />,
      );
    }

    /* ---- Street with zero: 0,1,2 and 0,2,3 (trio bets treated as street) ---- */
    // Top-right corner of zero cell → [0,2,3]
    zones.push(
      <div
        key={`zstreet-${idx++}`}
        className="bt-overlay-zone bt-street-zone"
        style={{
          left: CELL_W + BORDER - OVERLAY / 2,
          top: (CELL_H + BORDER) - OVERLAY / 2,
          width: OVERLAY,
          height: OVERLAY,
        }}
        onClick={() => place('street', [0, 2, 3])}
      />,
    );
    // Bottom-right corner of zero cell → [0,1,2]
    zones.push(
      <div
        key={`zstreet-${idx++}`}
        className="bt-overlay-zone bt-street-zone"
        style={{
          left: CELL_W + BORDER - OVERLAY / 2,
          top: 2 * (CELL_H + BORDER) - OVERLAY / 2,
          width: OVERLAY,
          height: OVERLAY,
        }}
        onClick={() => place('street', [0, 1, 2])}
      />,
    );

    return zones;
  }, [place]);

  /* ================================================================ */
  /*  Render overlay chips for split/corner/street/sixline bets        */
  /* ================================================================ */

  const overlayChips = useMemo(() => {
    const chips: React.ReactNode[] = [];

    for (const [key, entries] of allBets) {
      const firstBet = entries[0].bet;
      if (
        firstBet.type !== 'split' &&
        firstBet.type !== 'corner' &&
        firstBet.type !== 'sixline' &&
        firstBet.type !== 'street'
      ) {
        continue;
      }

      // Determine pixel position for the chip based on bet type
      let cx = 0;
      let cy = 0;
      const nums = firstBet.numbers;

      if (firstBet.type === 'split') {
        if (nums.includes(0)) {
          // zero-split: on the border between zero and the number
          const other = nums.find((n) => n !== 0)!;
          const pos = cellPixel(other);
          cx = pos.x - OVERLAY / 2;
          cy = pos.y + CELL_H / 2;
        } else {
          // Check if horizontal or vertical split
          const sorted = [...nums].sort((a, b) => a - b);
          const diff = sorted[1] - sorted[0];
          if (diff <= 2) {
            // Vertical split (adjacent numbers like 1-2 or 2-3)
            const pos1 = cellPixel(sorted[0]);
            const pos2 = cellPixel(sorted[1]);
            cx = pos1.x + CELL_W / 2;
            cy = (pos1.y + pos2.y) / 2 + CELL_H / 2;
          } else {
            // Horizontal split (numbers differ by 3, same row)
            const pos1 = cellPixel(sorted[0]);
            const pos2 = cellPixel(sorted[1]);
            cx = (pos1.x + pos2.x) / 2 + CELL_W / 2;
            cy = pos1.y + CELL_H / 2;
          }
        }
      } else if (firstBet.type === 'corner') {
        const sorted = [...nums].sort((a, b) => a - b);
        // Corner is at the intersection of 4 cells
        const pos1 = cellPixel(sorted[0]);
        const pos2 = cellPixel(sorted[3]);
        cx = (pos1.x + pos2.x) / 2 + CELL_W / 2;
        cy = (pos1.y + pos2.y) / 2 + CELL_H / 2;
      } else if (firstBet.type === 'street') {
        if (nums.includes(0)) {
          cx = CELL_W + BORDER;
          cy = CELL_H + BORDER;
        } else {
          const base = Math.min(...nums);
          const pos = cellPixel(base);
          cx = pos.x - OVERLAY / 2;
          cy = pos.y + CELL_H / 2;
        }
      } else if (firstBet.type === 'sixline') {
        const sorted = [...nums].sort((a, b) => a - b);
        const base1 = sorted[0];
        const base2 = sorted[3];
        const pos1 = cellPixel(base1);
        const pos2 = cellPixel(base2);
        cx = (pos1.x + pos2.x) / 2 + CELL_W / 2;
        cy = pos1.y + CELL_H + BORDER;
      }

      chips.push(
        <span
          key={`oc-${key}`}
          className="bt-overlay-chip-stack"
          style={{ left: cx - 9, top: cy - 9 }}
        >
          {entries.map((e, i) => (
            <span
              key={e.bet.id}
              className="bt-placed-chip"
              style={{
                backgroundColor: e.player.chipColor,
                top: `${i * -4}px`,
                left: `${i * 3}px`,
              }}
            >
              {e.bet.amount}
            </span>
          ))}
        </span>,
      );
    }

    return chips;
  }, [allBets]);

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  const dozenLabels = ['1st 12', '2nd 12', '3rd 12'] as const;
  const dozenKeys = ['1st12', '2nd12', '3rd12'] as const;

  const outsideBets: {
    label: string;
    type: BetType;
    numbers: number[];
    span: number;
    cls?: string;
  }[] = [
    {
      label: '1-18',
      type: 'low',
      numbers: Array.from({ length: 18 }, (_, i) => i + 1),
      span: 2,
    },
    {
      label: 'EVEN',
      type: 'even',
      numbers: Array.from({ length: 18 }, (_, i) => (i + 1) * 2),
      span: 2,
    },
    {
      label: 'RED',
      type: 'red',
      numbers: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
      span: 2,
      cls: 'red-bet',
    },
    {
      label: 'BLACK',
      type: 'black',
      numbers: [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35],
      span: 2,
      cls: 'black-bet',
    },
    {
      label: 'ODD',
      type: 'odd',
      numbers: Array.from({ length: 18 }, (_, i) => i * 2 + 1),
      span: 2,
    },
    {
      label: '19-36',
      type: 'high',
      numbers: Array.from({ length: 18 }, (_, i) => i + 19),
      span: 2,
    },
  ];

  return (
    <div className="betting-table-wrapper">
      <div className={`betting-table${isBetting ? '' : ' disabled'}`}>
        {/* ---- Zero cell ---- */}
        <div
          className={`bt-cell bt-zero green${winningNumber === 0 ? ' winning' : ''}`}
          style={{ gridColumn: 1, gridRow: '1 / 4' }}
          onClick={() => place('straight', [0])}
        >
          0
          {renderChips('straight', [0])}
        </div>

        {/* ---- Number cells (3 rows x 12 columns) ---- */}
        {TABLE_ROWS.map((row, rowIdx) =>
          row.map((num, colIdx) => {
            const color = getNumberColor(num);
            const isWinner = winningNumber === num;
            return (
              <div
                key={num}
                className={`bt-cell bt-number ${color}${isWinner ? ' winning' : ''}`}
                style={{
                  gridColumn: colIdx + 2,
                  gridRow: rowIdx + 1,
                }}
                onClick={() => place('straight', [num])}
              >
                {num}
                {renderChips('straight', [num])}
              </div>
            );
          }),
        )}

        {/* ---- Column bet cells (2:1) on the right ---- */}
        {(['col3', 'col2', 'col1'] as const).map((colKey, i) => (
          <div
            key={colKey}
            className="bt-cell bt-column"
            style={{ gridColumn: 14, gridRow: i + 1 }}
            onClick={() => place('column', COLUMNS[colKey])}
          >
            2:1
            {renderChips('column', COLUMNS[colKey])}
          </div>
        ))}

        {/* ---- Dozen cells ---- */}
        {dozenLabels.map((label, i) => {
          const key = dozenKeys[i];
          const colStart = 2 + i * 4;
          return (
            <div
              key={key}
              className="bt-cell bt-dozen"
              style={{
                gridColumn: `${colStart} / ${colStart + 4}`,
                gridRow: 4,
              }}
              onClick={() => place('dozen', DOZENS[key])}
            >
              {label}
              {renderChips('dozen', DOZENS[key])}
            </div>
          );
        })}

        {/* ---- Outside bet cells ---- */}
        {outsideBets.map((ob, i) => {
          const colStart = 2 + i * 2;
          return (
            <div
              key={ob.type}
              className={`bt-cell bt-outside${ob.cls ? ` ${ob.cls}` : ''}`}
              style={{
                gridColumn: `${colStart} / ${colStart + ob.span}`,
                gridRow: 5,
              }}
              onClick={() => place(ob.type, ob.numbers)}
            >
              {ob.label}
              {renderChips(ob.type, ob.numbers)}
            </div>
          );
        })}

        {/* ---- Overlay container for split / corner / street / sixline ---- */}
        <div className="bt-overlay-container">
          {overlayZones}
          {overlayChips}
        </div>
      </div>
    </div>
  );
}
