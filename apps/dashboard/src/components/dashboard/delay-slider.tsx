'use client';

const PRESETS = [0, 200, 500, 1000, 2000, 5000];

function label(ms: number) {
  if (ms === 0) return '0ms';
  if (ms < 1000) return `${ms}ms`;
  return `${ms / 1000}s`;
}

type DelaySliderProps = {
  value: number;
  onChange: (ms: number) => void;
};

export function DelaySlider({ value, onChange }: DelaySliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={5000}
          step={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 accent-primary cursor-pointer"
        />
        <span className="w-14 text-right text-sm font-mono font-medium text-gray-700 shrink-0">
          {label(value)}
        </span>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {PRESETS.map((ms) => (
          <button
            key={ms}
            type="button"
            onClick={() => onChange(ms)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              value === ms ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label(ms)}
          </button>
        ))}
      </div>
    </div>
  );
}
