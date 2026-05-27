import { animate, stagger, cubicBezier } from 'animejs'

// ─── Global easing tokens (Cohere-inspired) ───
export const EASING = {
  enter: cubicBezier(0, 0, 0.2, 1),        // ease-out
  exit: cubicBezier(0.4, 0, 1, 1),          // ease-in
  spring: cubicBezier(0.34, 1.56, 0.64, 1), // overshoot
  smooth: cubicBezier(0.4, 0, 0.2, 1),      // estándar
} as const

// ─── Page entrance ───
export function animatePageIn(element: HTMLElement) {
  animate(element, {
    opacity: [0, 1],
    translateY: [12, 0],
    duration: 400,
    easing: EASING.enter,
  })
}

// ─── Card stagger ───
export function animateCardStagger(container: HTMLElement, delay = 40) {
  const cards = container.querySelectorAll('[data-animate="card"]')
  if (!cards.length) return

  animate(cards as unknown as HTMLElement[], {
    opacity: [0, 1],
    translateY: [16, 0],
    scale: [0.97, 1],
    duration: 350,
    delay: stagger(delay, { start: 50 }),
    easing: EASING.enter,
  })
}

// ─── List stagger ───
export function animateListStagger(container: HTMLElement, delay = 30) {
  const items = container.querySelectorAll('[data-animate="list-item"]')
  if (!items.length) return

  animate(items as unknown as HTMLElement[], {
    opacity: [0, 1],
    translateX: [-8, 0],
    duration: 300,
    delay: stagger(delay, { start: 30 }),
    easing: EASING.enter,
  })
}

// ─── Modal entrance ───
export function animateModalIn(overlay: HTMLElement, content: HTMLElement) {
  animate(overlay, { opacity: [0, 1], duration: 200 })
  animate(content, {
    opacity: [0, 1],
    scale: [0.92, 1],
    translateY: [12, 0],
    duration: 300,
    easing: EASING.spring,
  })
}

// ─── Modal exit ───
export function animateModalOut(overlay: HTMLElement, content: HTMLElement) {
  animate(content, {
    opacity: [1, 0],
    scale: [1, 0.95],
    duration: 150,
    easing: EASING.exit,
  })
  animate(overlay, { opacity: [1, 0], duration: 100 })
}

// ─── Card hover ───
export function animateCardHoverIn(el: HTMLElement) {
  animate(el, { scale: 1.02, duration: 200, easing: EASING.smooth })
}

export function animateCardHoverOut(el: HTMLElement) {
  animate(el, { scale: 1, duration: 200, easing: EASING.smooth })
}

// ─── Toast ───
export function animateToastIn(element: HTMLElement) {
  animate(element, {
    translateX: [80, 0],
    opacity: [0, 1],
    duration: 300,
    easing: EASING.spring,
  })
}

export function animateToastOut(element: HTMLElement) {
  return animate(element, {
    translateX: [0, 80],
    opacity: [1, 0],
    duration: 200,
    easing: EASING.exit,
  })
}

// ─── Day highlight pulse ───
export function animateDayHighlight(element: HTMLElement) {
  animate(element, {
    boxShadow: [
      '0 0 0 0 rgba(0, 188, 158, 0.4)',
      '0 0 0 8px rgba(0, 188, 158, 0)',
    ],
    duration: 800,
    easing: EASING.smooth,
  })
}

// ─── Skeleton shimmer CSS helper ───
export function shimmerCSS() {
  return 'bg-gradient-to-r from-surface-muted via-rule/30 to-surface-muted bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]'
}
