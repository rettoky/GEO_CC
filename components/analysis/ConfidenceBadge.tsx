import { Badge } from '@/components/ui/badge'

interface ConfidenceBadgeProps {
  score: number
}

/**
 * Gemini 신뢰도 점수 뱃지 컴포넌트 (T047)
 */
export function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  const percentage = Math.round(score * 100)

  let variant: 'default' | 'secondary' | 'destructive' = 'default'
  let colorClass = 'bg-gray-500'

  if (percentage >= 80) {
    variant = 'default'
    colorClass = 'bg-green-600'
  } else if (percentage >= 50) {
    variant = 'secondary'
    colorClass = 'bg-yellow-600'
  } else {
    variant = 'destructive'
    colorClass = 'bg-red-600'
  }

  return (
    <Badge variant={variant} className={colorClass}>
      신뢰도: {percentage}%
    </Badge>
  )
}
