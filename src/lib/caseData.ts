export interface CaseIdentity {
  id: number
  case_number: number
  theme: string
  color_name: string
  color_hex: string
  icon: string
}

export const CASE_ICONS: Record<string, string> = {
  'blood-drop': '🩸',
  'magnifying-glass': '🔍',
  'crime-tape': '⚠️',
  'sealed-envelope': '✉️',
  'test-tube': '🧪',
  'brain': '🧠',
  'archive-folder': '📁',
  'evidence-bag': '🏷️',
  'cctv-camera': '📹',
  'hidden-key': '🔑',
}

// SVG icons for a more premium look
export const CASE_SVG_ICONS: Record<string, string> = {
  'blood-drop': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2.5c0 0-7 8-7 13a7 7 0 1 0 14 0c0-5-7-13-7-13z"/><circle cx="12" cy="16" r="2" fill="currentColor" opacity="0.5"/></svg>`,
  'magnifying-glass': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L20 20"/><path d="M10 7v6M7 10h6" opacity="0.4"/></svg>`,
  'crime-tape': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 8h20M2 16h20"/><path d="M4 8l16 8M4 16L20 8" opacity="0.5"/><rect x="8" y="10" width="8" height="4" rx="1" fill="currentColor" opacity="0.2"/></svg>`,
  'sealed-envelope': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 6l9 7 9-7"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/></svg>`,
  'test-tube': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 3h6M10 3v11.5a4.5 4.5 0 1 0 4 0V3"/><path d="M10 11h4" opacity="0.5"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>`,
  'brain': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 4a4 4 0 0 0-4 4c0 1-.5 2-1.5 2.5A3.5 3.5 0 0 0 4 14a4 4 0 0 0 4 4h0.5"/><path d="M12 4a4 4 0 0 1 4 4c0 1 .5 2 1.5 2.5A3.5 3.5 0 0 1 20 14a4 4 0 0 1-4 4h-0.5"/><path d="M12 4v16" opacity="0.3"/></svg>`,
  'archive-folder': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M3 7h18" opacity="0.4"/><path d="M10 13h4M12 11v4" opacity="0.5"/></svg>`,
  'evidence-bag': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 8h14"/><path d="M9 1v4M15 1v4" opacity="0.5"/><circle cx="12" cy="14" r="2"/><path d="M12 16v2"/></svg>`,
  'cctv-camera': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 12a4 4 0 0 1 4-4h4l6-4v16l-6-4H6a4 4 0 0 1-4-4z"/><circle cx="18" cy="12" r="3"/><path d="M21 12h1" opacity="0.5"/></svg>`,
  'hidden-key': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="15" r="4"/><path d="M11.5 11.5L20 3"/><path d="M17 3h3v3" opacity="0.5"/><path d="M15 7l2 2" opacity="0.5"/></svg>`,
}

export function getCaseColor(hex: string, opacity: number = 1): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}
