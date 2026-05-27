'use client'

import { useEffect, useRef, useCallback } from 'react'
import type { MutableRefObject } from 'react'
import {
  animatePageIn,
  animateCardStagger,
  animateListStagger,
  animateCardHoverIn,
  animateCardHoverOut,
  animateDayHighlight,
} from './animations'

// ─── Hook: page entrance animation ───
export function usePageIn(containerRef: MutableRefObject<HTMLElement | null>) {
  const done = useRef(false)

  useEffect(() => {
    if (done.current || !containerRef.current) return
    done.current = true

    const el = containerRef.current.querySelector('[data-animate="page"]')
    if (el instanceof HTMLElement) {
      animatePageIn(el)
    } else if (containerRef.current) {
      animatePageIn(containerRef.current)
    }
  }, [containerRef])
}

// ─── Hook: card stagger animation ───
export function useCardStagger(containerRef: MutableRefObject<HTMLElement | null>, delay = 40) {
  const done = useRef(false)

  useEffect(() => {
    if (done.current || !containerRef.current) return
    done.current = true
    animateCardStagger(containerRef.current, delay)
  }, [containerRef, delay])
}

// ─── Hook: list stagger animation ───
export function useListStagger(containerRef: MutableRefObject<HTMLElement | null>, delay = 30) {
  const done = useRef(false)

  useEffect(() => {
    if (done.current || !containerRef.current) return
    done.current = true
    animateListStagger(containerRef.current, delay)
  }, [containerRef, delay])
}

// ─── Hook: card hover handlers ───
export function useCardHover() {
  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLElement>) => {
    animateCardHoverIn(e.currentTarget)
  }, [])

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLElement>) => {
    animateCardHoverOut(e.currentTarget)
  }, [])

  return { onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave }
}

// ─── Hook: day column highlight on selection ───
export function useDayHighlight(ref: MutableRefObject<HTMLElement | null>) {
  const triggerHighlight = useCallback(() => {
    if (ref.current) {
      animateDayHighlight(ref.current)
    }
  }, [ref])

  return triggerHighlight
}
