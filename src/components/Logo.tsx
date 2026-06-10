import { type SVGAttributes } from "react";

type LogoVariant = "full" | "icon" | "wordmark";

interface LogoProps extends SVGAttributes<SVGSVGElement> {
  variant?: LogoVariant;
  size?: number;
}

function IconMark(props: SVGAttributes<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="0.5" y="0.5" width="31" height="31" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="8" x2="8" y2="24" />
        <line x1="8" y1="10" x2="23" y2="10" />
        <line x1="8" y1="17" x2="19" y2="17" />
        <line x1="8" y1="24" x2="15" y2="24" />
      </g>
      <circle cx="8" cy="8" r="1.2" fill="currentColor" />
      <circle cx="8" cy="17" r="1.2" fill="currentColor" />
      <circle cx="8" cy="24" r="1.2" fill="currentColor" />
      <circle cx="23" cy="10" r="1.2" fill="currentColor" />
      <circle cx="19" cy="17" r="1.2" fill="currentColor" />
      <circle cx="15" cy="24" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function Logo({ variant = "full", size, className, ...props }: LogoProps) {
  const h = size ?? 28;

  if (variant === "icon") {
    return <IconMark width={h} height={h} className={className} {...props} />;
  }

  if (variant === "wordmark") {
    return (
      <svg viewBox="0 0 120 24" fill="none" xmlns="http://www.w3.org/2000/svg" height={h} className={className} {...props}>
        <text x="0" y="16" fontFamily="'Cormorant Garamond', 'Times New Roman', serif" fontSize={16} fontWeight={400} letterSpacing="3" fill="currentColor">
          FORMA
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 180 44" fill="none" xmlns="http://www.w3.org/2000/svg" height={h} className={className} {...props}>
      <g transform="translate(2, 6)">
        <rect x="0.5" y="0.5" width="31" height="31" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.2" />
        <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="8" x2="8" y2="24" />
          <line x1="8" y1="10" x2="23" y2="10" />
          <line x1="8" y1="17" x2="19" y2="17" />
          <line x1="8" y1="24" x2="15" y2="24" />
        </g>
        <circle cx="8" cy="8" r="1.2" fill="currentColor" />
        <circle cx="8" cy="17" r="1.2" fill="currentColor" />
        <circle cx="8" cy="24" r="1.2" fill="currentColor" />
        <circle cx="23" cy="10" r="1.2" fill="currentColor" />
        <circle cx="19" cy="17" r="1.2" fill="currentColor" />
        <circle cx="15" cy="24" r="1.2" fill="currentColor" />
      </g>
      <text x="46" y="28" fontFamily="'Cormorant Garamond', 'Times New Roman', serif" fontSize={20} fontWeight={400} letterSpacing="4" fill="currentColor" dominantBaseline="middle">
        FORMA
      </text>
      <line x1="48" y1="34" x2="124" y2="34" stroke="currentColor" strokeWidth="0.5" opacity="0.4" />
    </svg>
  );
}
