import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 shadow-sm shadow-sky-700/20",
        className
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" className="size-8" fill="none">
        <defs>
          <radialGradient id="brand-cat-fur" cx="34%" cy="22%" r="76%">
            <stop stopColor="#ffe1a6" />
            <stop offset=".58" stopColor="#f8aa3c" />
            <stop offset="1" stopColor="#dc7b19" />
          </radialGradient>
          <filter id="brand-cat-shadow" x="4" y="5" width="40" height="40" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#0f2f55" floodOpacity=".24" />
          </filter>
        </defs>
        <g filter="url(#brand-cat-shadow)">
          <path d="m13.5 18.5-1.2-8.2 7 4.4M34.5 18.5l1.2-8.2-7 4.4" fill="url(#brand-cat-fur)" />
          <path
            d="M11.5 25c0-8 5.6-13.8 12.5-13.8S36.5 17 36.5 25 30.9 38.8 24 38.8 11.5 33 11.5 25Z"
            fill="url(#brand-cat-fur)"
          />
          <path d="m16.2 17.6-.4-3 2.7 1.7M31.8 17.6l.4-3-2.7 1.7" fill="#ffb1b8" opacity=".85" />
          <circle cx="19.5" cy="25" r="2.2" fill="#102033" />
          <circle cx="28.5" cy="25" r="2.2" fill="#102033" />
          <circle cx="18.8" cy="24.2" r=".7" fill="#fff" />
          <circle cx="27.8" cy="24.2" r=".7" fill="#fff" />
          <path d="M23 29c.7.5 1.3.5 2 0" stroke="#7c3f12" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M20.5 31.7c2.1 1.9 4.9 1.9 7 0" stroke="#7c3f12" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M16.7 28.4h-5.2M17 31.4h-4.2M31.3 28.4h5.2M31 31.4h4.2" stroke="#7c3f12" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M15 21.6c1.8-1.5 4-1.6 5.8-.2M27.2 21.4c1.8-1.4 4-1.3 5.8.2" stroke="#9a571b" strokeWidth="1.7" strokeLinecap="round" />
        </g>
        <circle cx="35" cy="36" r="5.5" fill="#ffd166" stroke="#f59e0b" strokeWidth="1.5" />
        <path d="M32 36h6M35 33v6" stroke="#b87503" strokeLinecap="round" strokeWidth="1.6" />
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
