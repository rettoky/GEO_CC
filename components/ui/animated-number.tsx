'use client'

import { useCountUp } from '@/hooks/useCountUp'
import { cn } from '@/lib/utils'

interface AnimatedNumberProps {
  value: number
  duration?: number
  delay?: number
  decimals?: number
  className?: string
  prefix?: string
  suffix?: string
}

/**
 * 숫자 카운트업 애니메이션 컴포넌트
 */
export function AnimatedNumber({
  value,
  duration = 1000,
  delay = 0,
  decimals = 0,
  className,
  prefix = '',
  suffix = '',
}: AnimatedNumberProps) {
  const { count, isAnimating } = useCountUp({
    end: value,
    duration,
    delay,
    decimals,
    easing: 'easeOut',
  })

  return (
    <span
      className={cn(
        'inline-block tabular-nums transition-all',
        isAnimating && 'animate-count-up',
        className
      )}
    >
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  )
}
