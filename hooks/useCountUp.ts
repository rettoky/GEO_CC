'use client'

import { useState, useEffect, useRef } from 'react'

interface UseCountUpOptions {
  start?: number
  end: number
  duration?: number
  delay?: number
  decimals?: number
  easing?: 'linear' | 'easeOut' | 'easeInOut'
}

/**
 * 숫자 카운트업 애니메이션 훅
 */
export function useCountUp({
  start = 0,
  end,
  duration = 1000,
  delay = 0,
  decimals = 0,
  easing = 'easeOut',
}: UseCountUpOptions) {
  const [count, setCount] = useState(start)
  const [isAnimating, setIsAnimating] = useState(false)
  const frameRef = useRef<number>()
  const startTimeRef = useRef<number>()

  const easingFunctions = {
    linear: (t: number) => t,
    easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
    easeInOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  }

  useEffect(() => {
    const startAnimation = () => {
      setIsAnimating(true)
      startTimeRef.current = undefined

      const animate = (timestamp: number) => {
        if (!startTimeRef.current) {
          startTimeRef.current = timestamp
        }

        const elapsed = timestamp - startTimeRef.current
        const progress = Math.min(elapsed / duration, 1)
        const easedProgress = easingFunctions[easing](progress)
        const currentCount = start + (end - start) * easedProgress

        setCount(Number(currentCount.toFixed(decimals)))

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(animate)
        } else {
          setIsAnimating(false)
        }
      }

      frameRef.current = requestAnimationFrame(animate)
    }

    const timer = setTimeout(startAnimation, delay)

    return () => {
      clearTimeout(timer)
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [start, end, duration, delay, decimals, easing])

  return { count, isAnimating }
}

/**
 * 뷰포트 진입 시 카운트업 시작하는 훅
 */
export function useCountUpOnView(options: UseCountUpOptions) {
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !shouldAnimate) {
          setShouldAnimate(true)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [shouldAnimate])

  const { count, isAnimating } = useCountUp({
    ...options,
    end: shouldAnimate ? options.end : options.start ?? 0,
  })

  return { count, isAnimating, ref }
}
