'use client'

import { useRef, type ReactNode } from 'react'
import { usePageIn, useCardStagger, useListStagger } from '@/lib/animation-hooks'

type AnimMode = 'page' | 'cards' | 'list' | 'all'

/**
 * Componente wrapper que aplica animaciones de entrada a la página.
 * 
 * @param mode - 'page': solo fade-in. 'cards': + stagger en data-animate="card". 'list': + stagger en data-animate="list-item". 'all': todos.
 * @param staggerDelay - delay entre items (default: 40ms para cards, 30ms para list)
 */
export default function PageAnimator({
  children,
  mode = 'all',
  className = '',
}: {
  children: ReactNode
  mode?: AnimMode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null!)

  usePageIn(ref)
  if (mode === 'cards' || mode === 'all') {
    useCardStagger(ref, 40)
  }
  if (mode === 'list' || mode === 'all') {
    useListStagger(ref, 30)
  }

  return (
    <div ref={ref} className={className}>
      {mode === 'all' || mode === 'page' ? (
        <div data-animate="page">{children}</div>
      ) : (
        children
      )}
    </div>
  )
}
