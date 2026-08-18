/**
 * regtipass mark: an abstract folded flag/ribbon shape in the app's orange
 * accent, kept as a single inline SVG so it stays crisp at any size and can
 * be reused for the favicon/PWA icons via scripts/generate-icons.mjs.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="400 250 470 720" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="regtipassLogoGradTop" x1="460" y1="290" x2="790" y2="600" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fdba74" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="regtipassLogoGradBottom" x1="447" y1="813" x2="842" y2="950" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ea580c" />
          <stop offset="1" stopColor="#9a3412" />
        </linearGradient>
      </defs>
      <path
        d="M 766.08 298.63 Q 760.00 292.00 751.64 288.66 L 743.36 285.34 Q 735.00 282.00 726.02 282.58 L 712.98 283.42 Q 704.00 284.00 695.84 287.79 L 486.16 385.21 Q 478.00 389.00 471.78 395.50 L 462.22 405.50 Q 456.00 412.00 452.84 420.43 L 450.16 427.57 Q 447.00 436.00 447.00 445.00 L 447.00 786.00 Q 447.00 795.00 452.45 787.83 L 460.55 777.17 Q 466.00 770.00 473.59 765.17 L 502.41 746.83 Q 510.00 742.00 510.00 733.00 L 510.00 480.23 Q 510.00 473.00 513.43 466.63 L 513.57 466.37 Q 517.00 460.00 524.22 459.58 L 525.67 459.49 Q 534.00 459.00 541.41 462.84 L 689.82 539.79 Q 696.00 543.00 700.41 548.39 L 700.59 548.61 Q 705.00 554.00 705.10 560.96 L 705.88 618.00 Q 706.00 627.00 713.65 622.26 L 782.35 579.74 Q 790.00 575.00 790.00 566.00 L 790.00 349.00 Q 790.00 340.00 787.15 331.46 L 784.85 324.54 Q 782.00 316.00 775.92 309.37 Z"
        fill="url(#regtipassLogoGradTop)"
      />
      <path
        d="M 835.07 607.52 Q 833.00 602.00 828.59 598.08 L 827.94 597.51 Q 824.00 594.00 819.10 592.04 L 818.90 591.96 Q 814.00 590.00 808.83 591.03 L 802.83 592.23 Q 794.00 594.00 786.55 599.05 L 478.45 807.95 Q 471.00 813.00 465.60 820.20 L 461.40 825.80 Q 456.00 833.00 453.06 841.50 L 449.94 850.50 Q 447.00 859.00 446.88 868.00 L 446.08 928.27 Q 446.00 934.00 447.96 939.39 L 448.19 940.02 Q 450.00 945.00 454.41 947.94 L 454.59 948.06 Q 459.00 951.00 464.28 950.59 L 465.63 950.49 Q 472.00 950.00 477.69 947.10 L 800.45 782.34 Q 807.00 779.00 812.88 774.59 L 813.12 774.41 Q 819.00 770.00 823.63 764.30 L 826.32 760.99 Q 832.00 754.00 834.85 745.46 L 839.15 732.54 Q 842.00 724.00 842.00 715.00 L 842.00 635.00 Q 842.00 626.00 838.84 617.57 Z"
        fill="url(#regtipassLogoGradBottom)"
      />
      <circle cx="626.5" cy="425" r="34" fill="#ffffff" />
    </svg>
  );
}

export function Logo({ className, wordmarkClassName }: { className?: string; wordmarkClassName?: string }) {
  return (
    <span className="flex items-center gap-2">
      <LogoMark className={className ?? "h-8 w-8"} />
      <span className={wordmarkClassName ?? "text-[15px] font-semibold tracking-tight text-zinc-900"}>
        regtipass
      </span>
    </span>
  );
}
