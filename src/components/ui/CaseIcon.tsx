import { CASE_SVG_ICONS } from '../../lib/caseData'

interface CaseIconProps {
  icon: string
  color: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
}

export default function CaseIcon({ icon, color, size = 'md', className = '' }: CaseIconProps) {
  const svgContent = CASE_SVG_ICONS[icon]

  if (!svgContent) {
    return (
      <div
        className={`${sizeMap[size]} rounded-full flex items-center justify-center ${className}`}
        style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40` }}
      >
        <span className="text-sm">?</span>
      </div>
    )
  }

  return (
    <div
      className={`${sizeMap[size]} ${className}`}
      style={{ color }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  )
}
