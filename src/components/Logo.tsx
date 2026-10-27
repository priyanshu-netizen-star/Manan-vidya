/** VoxVision mark (same geometry as voxvision.site). */
export function VoxLogo({ className = "w-8 h-8", id = "vx" }: { className?: string; id?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6c5ce7" />
          <stop offset="100%" stopColor="#00cec9" />
        </linearGradient>
      </defs>
      <polygon points="40,4 62,22 74,10 74,42 40,76 6,42 6,10 18,22" fill={`url(#${id}-g)`} opacity="0.15" />
      <polyline points="18,22 6,10 6,42" stroke={`url(#${id}-g)`} strokeWidth="3" fill="none" strokeLinecap="round" />
      <polyline points="62,22 74,10 74,42" stroke={`url(#${id}-g)`} strokeWidth="3" fill="none" strokeLinecap="round" />
      <polyline points="6,42 40,76 74,42" stroke={`url(#${id}-g)`} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="40" cy="38" r="10" stroke={`url(#${id}-g)`} strokeWidth="2.5" fill="none" />
      <circle cx="40" cy="38" r="4" fill={`url(#${id}-g)`} />
    </svg>
  );
}

/** `id` must be unique per page: SVG gradient ids are document-global. */
export function ProductMark({ dark = false, id }: { dark?: boolean; id?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <VoxLogo className="w-8 h-8 shrink-0" id={id ?? (dark ? "vxd" : "vxl")} />
      <span className="leading-tight">
        <span className={`block text-[0.95rem] font-bold tracking-wider font-display ${dark ? "text-white" : "text-ink"}`}>
          VOXVISION
        </span>
        <span className={`block text-[0.68rem] font-semibold tracking-wide ${dark ? "text-[#9ca3af]" : "text-muted"}`}>School OS</span>
      </span>
    </span>
  );
}
