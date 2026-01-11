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

export function DuplicateIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      {/* Two cascading squares */}
      <rect x="5" y="5" width="10" height="10" rx="1" />
      <rect x="9" y="9" width="10" height="10" rx="1" />
      {/* Plus sign in the top right of the front square */}
      <line x1="13" y1="9" x2="13" y2="11" strokeWidth={2} />
      <line x1="12" y1="10" x2="14" y2="10" strokeWidth={2} />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps) {
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
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      {/* Almond-shaped eye outline */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12c2-4 5.5-6 9-6s7 2 9 6c-2 4-5.5 6-9 6s-7-2-9-6z"
      />
      {/* Smaller iris */}
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function EyeSlashIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      {/* Almond-shaped eye outline */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12c2-4 5.5-6 9-6s7 2 9 6c-2 4-5.5 6-9 6s-7-2-9-6z"
      />
      {/* Smaller iris */}
      <circle cx="12" cy="12" r="2" />
      {/* Diagonal slash */}
      <line x1="4" y1="20" x2="20" y2="4" strokeLinecap="round" />
    </svg>
  );
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      {/* Circular arrow path */}
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 12a8 8 0 0114.5-4.5M20 12a8 8 0 01-14.5 4.5"
      />
      {/* Arrow heads */}
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.5 4v4h-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 20v-4h4" />
    </svg>
  );
}
