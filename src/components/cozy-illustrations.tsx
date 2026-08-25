import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-sky-700/20",
        className
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" className="size-7" fill="none">
        <path
          d="M14.5 20.5c0-4.2 3.4-7.5 7.5-7.5h4c4.1 0 7.5 3.3 7.5 7.5v9c0 4.1-3.4 7.5-7.5 7.5h-4c-4.1 0-7.5-3.4-7.5-7.5v-9Z"
          fill="currentColor"
          opacity=".96"
        />
        <path d="m17 16-2.8-5.2 7 2.7M31 16l2.8-5.2-7 2.7" fill="currentColor" />
        <path
          d="M20.5 25.5h7c1.9 0 3.5 1.6 3.5 3.5s-1.6 3.5-3.5 3.5h-7A3.5 3.5 0 0 1 17 29c0-1.9 1.6-3.5 3.5-3.5Z"
          fill="#fff"
          opacity=".95"
        />
        <path d="M20 22.5h.1M28 22.5h.1" stroke="#0f2f55" strokeWidth="3" strokeLinecap="round" />
        <path d="M22.5 29h3" stroke="#0f2f55" strokeWidth="2" strokeLinecap="round" />
        <path d="M33 33.5c3.6-.4 5.8 1.3 6.5 4.7" stroke="#ffd166" strokeWidth="3" strokeLinecap="round" />
        <circle cx="39" cy="39" r="5" fill="#ffd166" stroke="#f59e0b" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function CatMascot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 130" className={cn("h-auto w-36", className)} fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="cat-fur" cx="34%" cy="25%" r="72%">
          <stop stopColor="#ffd27a" />
          <stop offset=".58" stopColor="#f6a83c" />
          <stop offset="1" stopColor="#d97916" />
        </radialGradient>
        <radialGradient id="cat-eye" cx="34%" cy="28%" r="64%">
          <stop stopColor="#ffffff" />
          <stop offset=".22" stopColor="#1f2937" />
          <stop offset="1" stopColor="#06070a" />
        </radialGradient>
        <filter id="cat-soft-shadow" x="0" y="0" width="180" height="130" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="10" stdDeviation="7" floodColor="#0f2f55" floodOpacity=".18" />
        </filter>
      </defs>
      <ellipse cx="93" cy="114" rx="58" ry="10" fill="#8ecbff" opacity=".25" />
      <g filter="url(#cat-soft-shadow)">
        <path
          d="M48 85c0-22 20-40 45-40h23c19 0 34 15 34 34 0 23-19 41-42 41H79c-17 0-31-15-31-35Z"
          fill="url(#cat-fur)"
        />
        <path
          d="M39 64c0-24 20-43 44-43h14c22 0 40 18 40 40 0 26-21 46-47 46h-4c-26 0-47-19-47-43Z"
          fill="url(#cat-fur)"
        />
        <path d="m53 36-4-25 22 14M122 35l10-23 13 25" fill="#f3a23a" />
        <path d="m58 35-3-13 12 7M129 34l5-12 6 13" fill="#ff9aa8" opacity=".8" />
        <ellipse cx="69" cy="61" rx="10" ry="13" fill="url(#cat-eye)" />
        <ellipse cx="108" cy="61" rx="10" ry="13" fill="url(#cat-eye)" />
        <circle cx="65" cy="56" r="3" fill="#ffffff" opacity=".95" />
        <circle cx="104" cy="56" r="3" fill="#ffffff" opacity=".95" />
        <path d="M86 70c3 2 7 2 10 0" stroke="#7c3f12" strokeLinecap="round" strokeWidth="3" />
        <path d="M80 80c7 6 19 6 26 0" stroke="#7c3f12" strokeLinecap="round" strokeWidth="3" />
        <path d="M57 52c4-5 11-5 15-1M101 51c5-4 12-3 16 2" stroke="#9a571b" strokeLinecap="round" strokeWidth="4" />
        <circle cx="59" cy="74" r="5" fill="#ffb0b8" opacity=".8" />
        <circle cx="118" cy="74" r="5" fill="#ffb0b8" opacity=".8" />
        <path d="M55 76H32M56 84H35M122 76h23M121 84h21" stroke="#7c3f12" strokeLinecap="round" strokeWidth="3" />
        <path
          d="M137 61c17-14 27-5 26 10-1 17-18 24-31 13"
          stroke="#d97916"
          strokeLinecap="round"
          strokeWidth="13"
        />
        <path d="M66 27c-4 10-4 17-1 22M85 24c-5 11-5 19-2 25M105 27c-6 9-7 16-4 23" stroke="#d97916" strokeLinecap="round" strokeWidth="5" />
        <path d="M126 55c8 2 14 5 19 10M125 65c7 3 13 7 17 13" stroke="#d97916" strokeLinecap="round" strokeWidth="5" />
      </g>
    </svg>
  );
}

export function CoinStack({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 110" className={cn("h-auto w-28", className)} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="coin-side" x1="26" x2="92" y1="48" y2="96">
          <stop stopColor="#ffd978" />
          <stop offset="1" stopColor="#e7a11b" />
        </linearGradient>
        <linearGradient id="coin-top" x1="28" x2="119" y1="24" y2="49">
          <stop stopColor="#fff1ad" />
          <stop offset="1" stopColor="#f8bd3b" />
        </linearGradient>
        <filter id="coin-shadow" x="0" y="0" width="150" height="110" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#0f2f55" floodOpacity=".16" />
        </filter>
      </defs>
      <g filter="url(#coin-shadow)">
        <ellipse cx="53" cy="85" rx="31" ry="11" fill="#d98a11" opacity=".55" />
        <path d="M22 65v19c0 7 14 12 31 12s31-5 31-12V65" fill="url(#coin-side)" />
        <ellipse cx="53" cy="65" rx="31" ry="12" fill="url(#coin-top)" />
        <path d="M25 74c10 6 46 6 56 0M25 84c10 6 46 6 56 0" stroke="#d98a11" strokeWidth="2" />
        <path d="M64 36v25c0 7 14 12 31 12s31-5 31-12V36" fill="url(#coin-side)" />
        <ellipse cx="95" cy="36" rx="31" ry="12" fill="url(#coin-top)" />
        <path d="M68 47c10 6 44 6 55 0M68 57c10 6 44 6 55 0" stroke="#d98a11" strokeWidth="2" />
        <path d="m23 35 5-10 5 10 10 5-10 5-5 10-5-10-10-5 10-5Z" fill="#9bd7b5" />
      </g>
    </svg>
  );
}

export function WalletIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 130" className={cn("h-auto w-36", className)} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="wallet-body" x1="52" x2="148" y1="27" y2="111">
          <stop stopColor="#58adff" />
          <stop offset=".55" stopColor="#2387eb" />
          <stop offset="1" stopColor="#1766c2" />
        </linearGradient>
        <linearGradient id="wallet-front" x1="50" x2="154" y1="54" y2="99">
          <stop stopColor="#3b97f5" />
          <stop offset="1" stopColor="#1766c2" />
        </linearGradient>
        <linearGradient id="wallet-cash" x1="67" x2="120" y1="26" y2="50">
          <stop stopColor="#d8f8dc" />
          <stop offset="1" stopColor="#77d59e" />
        </linearGradient>
        <filter id="wallet-shadow" x="0" y="0" width="180" height="130" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="11" stdDeviation="7" floodColor="#0f2f55" floodOpacity=".18" />
        </filter>
      </defs>
      <g filter="url(#wallet-shadow)">
        <path d="M48 45c0-10 8-18 18-18h64c10 0 18 8 18 18v48c0 10-8 18-18 18H66c-10 0-18-8-18-18V45Z" fill="url(#wallet-body)" />
        <path d="M48 54h95c10 0 18 8 18 18v9c0 10-8 18-18 18H48V54Z" fill="url(#wallet-front)" />
        <path d="M133 68h29v22h-29c-6 0-11-5-11-11s5-11 11-11Z" fill="#9bd7ff" stroke="#0f5fb8" strokeWidth="3" />
        <circle cx="135" cy="79" r="4" fill="#fff" />
        <path d="M64 35c17-18 42-22 61-9L83 50 64 35Z" fill="url(#wallet-cash)" stroke="#35a779" strokeWidth="3" />
        <path d="M73 29c17-7 34-7 48 2" stroke="#fff" strokeLinecap="round" strokeWidth="4" />
        <circle cx="46" cy="90" r="13" fill="#ffd166" stroke="#f59e0b" strokeWidth="3" />
        <path d="M39 90h14M46 83v14" stroke="#b87503" strokeLinecap="round" strokeWidth="3" />
        <path d="m28 55 4-8 4 8 8 4-8 4-4 8-4-8-8-4 8-4Z" fill="#ffd166" />
      </g>
    </svg>
  );
}
