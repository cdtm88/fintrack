interface Props {
  size?: number;
  showWordmark?: boolean;
}

export default function FintrackLogo({ size = 28, showWordmark = true }: Props) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 72 72" fill="none">
        <defs>
          <linearGradient id="ft-ring" x1="10" y1="10" x2="62" y2="62" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#5b21b6" />
          </linearGradient>
          <linearGradient id="ft-line" x1="20" y1="48" x2="47" y2="27" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#c4b5fd" />
            <stop offset="100%" stopColor="#ede9fe" />
          </linearGradient>
        </defs>
        {/* Ring track */}
        <circle cx="36" cy="36" r="30" className="stroke-slate-200 dark:stroke-[#1e1b33]" strokeWidth="7" fill="none" />
        {/* Ring arc 270° */}
        <circle cx="36" cy="36" r="30" stroke="url(#ft-ring)" strokeWidth="7"
          strokeDasharray="141.4 47.1" strokeDashoffset="35.3" strokeLinecap="round" fill="none" />
        {/* Inner background */}
        <circle cx="36" cy="36" r="22" className="fill-white dark:fill-[#100e1d]" />
        {/* Trend line */}
        <polyline points="20,48 26,50 33,42 40,37 47,27"
          stroke="url(#ft-line)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Arrowhead */}
        <polyline points="43,27 47,24 50,29"
          stroke="#ede9fe" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Dot on ring */}
        <circle cx="57" cy="22" r="3.5" fill="#7c3aed" />
        <circle cx="57" cy="22" r="1.8" fill="#c4b5fd" />
      </svg>

      {showWordmark && (
        <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}>
          <span className="text-indigo-500 dark:text-indigo-400">fin</span>
          <span className="text-slate-900 dark:text-white">track</span>
        </span>
      )}
    </div>
  );
}
