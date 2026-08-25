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
      <ellipse cx="91" cy="113" rx="58" ry="10" fill="#c9e8ff" opacity=".75" />
      <path
        d="M48 75c0-24 19-43 43-43h11c21 0 38 17 38 38v4c0 27-22 49-49 49S48 102 48 75Z"
        fill="#fff"
        stroke="#8ecbff"
        strokeWidth="4"
      />
      <path
        d="m61 42-6-23 23 13M120 41l9-22 16 22"
        fill="#fff"
        stroke="#8ecbff"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path d="M70 70c5 5 12 5 17 0M102 70c5 5 12 5 17 0" stroke="#18345c" strokeLinecap="round" strokeWidth="4" />
      <path d="M90 80c3 2 7 2 10 0" stroke="#18345c" strokeLinecap="round" strokeWidth="3" />
      <path d="M84 89c7 5 16 5 23 0" stroke="#ff8c8c" strokeLinecap="round" strokeWidth="3" />
      <circle cx="66" cy="83" r="5" fill="#ffd1d8" />
      <circle cx="122" cy="83" r="5" fill="#ffd1d8" />
      <path d="M60 82H39M61 90H43M129 82h18M127 90h20" stroke="#8ca8c8" strokeLinecap="round" strokeWidth="3" />
      <path
        d="M47 88c-14-4-22 3-22 13 0 9 9 15 21 10"
        stroke="#8ecbff"
        strokeLinecap="round"
        strokeWidth="7"
      />
      <circle cx="136" cy="101" r="16" fill="#ffd166" stroke="#f59e0b" strokeWidth="3" />
      <path d="M128 101h16M136 93v16" stroke="#b87503" strokeLinecap="round" strokeWidth="3" />
      <path d="M31 105c-2-10 7-18 17-13" stroke="#9bd7b5" strokeLinecap="round" strokeWidth="5" />
      <path d="M31 105c8-2 13-8 15-15" stroke="#9bd7b5" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

export function CoinStack({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 110" className={cn("h-auto w-28", className)} fill="none" aria-hidden="true">
      <ellipse cx="52" cy="83" rx="31" ry="11" fill="#f8bd3b" stroke="#e49516" strokeWidth="3" />
      <path d="M21 66v17c0 6 14 11 31 11s31-5 31-11V66" fill="#ffd166" />
      <path d="M21 66v17c0 6 14 11 31 11s31-5 31-11V66" stroke="#e49516" strokeWidth="3" />
      <ellipse cx="52" cy="66" rx="31" ry="11" fill="#ffe08a" stroke="#e49516" strokeWidth="3" />
      <path d="M23 74c8 6 48 6 58 0M23 83c8 6 48 6 58 0" stroke="#e49516" strokeWidth="2" />
      <ellipse cx="94" cy="61" rx="31" ry="11" fill="#f8bd3b" stroke="#e49516" strokeWidth="3" />
      <path d="M63 37v24c0 6 14 11 31 11s31-5 31-11V37" fill="#ffd166" />
      <path d="M63 37v24c0 6 14 11 31 11s31-5 31-11V37" stroke="#e49516" strokeWidth="3" />
      <ellipse cx="94" cy="37" rx="31" ry="11" fill="#ffe08a" stroke="#e49516" strokeWidth="3" />
      <path d="M66 46c8 6 48 6 57 0M66 56c8 6 48 6 57 0" stroke="#e49516" strokeWidth="2" />
      <path d="m22 35 5-10 5 10 10 5-10 5-5 10-5-10-10-5 10-5Z" fill="#9bd7b5" />
    </svg>
  );
}

export function WalletIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 180 130" className={cn("h-auto w-36", className)} fill="none" aria-hidden="true">
      <path d="M48 45c0-10 8-18 18-18h64c10 0 18 8 18 18v48c0 10-8 18-18 18H66c-10 0-18-8-18-18V45Z" fill="#3b97f5" />
      <path d="M48 54h95c10 0 18 8 18 18v9c0 10-8 18-18 18H48V54Z" fill="#2477d4" />
      <path d="M133 68h29v22h-29c-6 0-11-5-11-11s5-11 11-11Z" fill="#8ecbff" stroke="#0f5fb8" strokeWidth="3" />
      <circle cx="135" cy="79" r="4" fill="#fff" />
      <path d="M64 35c17-18 42-22 61-9L83 50 64 35Z" fill="#9bd7b5" stroke="#35a779" strokeWidth="3" />
      <path d="M73 29c17-7 34-7 48 2" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <circle cx="46" cy="90" r="13" fill="#ffd166" stroke="#f59e0b" strokeWidth="3" />
      <path d="M39 90h14M46 83v14" stroke="#b87503" strokeWidth="3" strokeLinecap="round" />
      <path d="m28 55 4-8 4 8 8 4-8 4-4 8-4-8-8-4 8-4Z" fill="#ffd166" />
    </svg>
  );
}
