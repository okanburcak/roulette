import './ChipSelector.css';

interface ChipSelectorProps {
  selectedValue: number;
  onSelect: (value: number) => void;
  balance: number;
}

const CHIP_DENOMINATIONS = [1, 5, 10, 25, 100] as const;

const CHIP_COLORS: Record<number, { bg: string; text: string }> = {
  1:   { bg: '#ffffff', text: '#1a1a2e' },
  5:   { bg: '#e74c3c', text: '#ffffff' },
  10:  { bg: '#3498db', text: '#ffffff' },
  25:  { bg: '#2ecc71', text: '#ffffff' },
  100: { bg: '#1a1a2e', text: '#ffffff' },
};

function formatBalance(amount: number): string {
  return amount.toLocaleString();
}

export default function ChipSelector({ selectedValue, onSelect, balance }: ChipSelectorProps) {
  return (
    <div className="chip-selector">
      <div className="chip-selector-row">
        {CHIP_DENOMINATIONS.map((value) => {
          const colors = CHIP_COLORS[value];
          const isSelected = selectedValue === value;
          const isDisabled = value > balance;

          return (
            <button
              key={value}
              className={`chip-btn${isSelected ? ' selected' : ''}${isDisabled ? ' disabled' : ''}`}
              style={{
                '--chip-bg': colors.bg,
                '--chip-text': colors.text,
              } as React.CSSProperties}
              onClick={() => {
                if (!isDisabled) onSelect(value);
              }}
              disabled={isDisabled}
              aria-label={`Select ${value} chip`}
              aria-pressed={isSelected}
            >
              <span className="chip-inner-ring" />
              <span className="chip-value">{value}</span>
            </button>
          );
        })}
      </div>
      <div className="chip-selector-balance">
        Balance: {formatBalance(balance)}
      </div>
    </div>
  );
}
