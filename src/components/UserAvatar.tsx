// ─── Initials-based avatar with deterministic color ───────────────────

const AVATAR_COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
]

function hashStr(s: string): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0][0].toUpperCase()
  }
  return email?.[0]?.toUpperCase() || '?'
}

export default function UserAvatar({
  name,
  email,
  size = 'sm',
}: {
  name?: string | null
  email?: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const seed = email || name || ''
  const colorIndex = seed ? hashStr(seed) % AVATAR_COLORS.length : 0
  const { bg, text } = AVATAR_COLORS[colorIndex]
  const initials = getInitials(name, email)

  const sizeClasses: Record<string, string> = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  }

  return (
    <div
      className={`${sizeClasses[size]} ${bg} ${text} rounded-full flex items-center justify-center font-semibold shrink-0 select-none`}
      title={email || name || undefined}
      aria-label={name || email || 'Usuario'}
    >
      {initials}
    </div>
  )
}
