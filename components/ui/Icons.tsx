interface IconProps {
  className?: string;
}

export function WorkPlaneIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <rect x="6" y="6" width="12" height="12" />
      <line x1="12" y1="6" x2="12" y2="18" />
      <line x1="6" y1="12" x2="18" y2="12" />
    </svg>
  );
}

export function PolylineIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 19l8-8 4 4 6-6"
      />
    </svg>
  );
}

export function LoftIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      {/* Top square (diamond perspective) */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4l6 4-6 4-6-4 6-4z"
      />
      {/* Bottom square (diamond perspective) */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 14l6 4-6 4-6-4 6-4z"
      />
      {/* Dashed lines connecting extents */}
      <line x1="6" y1="8" x2="6" y2="14" strokeDasharray="2 2" />
      <line x1="18" y1="8" x2="18" y2="14" strokeDasharray="2 2" />
      <line x1="12" y1="4" x2="12" y2="10" strokeDasharray="2 2" />
      <line x1="12" y1="10" x2="12" y2="20" strokeDasharray="2 2" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
