import anime from 'animejs'

// ─── Global easing tokens (Cohere-inspired) ───
export const EASING = {
  enter: 'cubicBezier(0, 0, 0.2, 1)',        // ease-out — aceleración rápida, desacelera suave
  exit: 'cubicBezier(0.4, 0, 1, 1)',          // ease-in — lento al inicio, rápido al final
  spring: 'cubicBezier(0.34, 1.56, 0.64, 1)', // overshoot suave
  smooth: 'cubicBezier(0.4, 0, 0.2, 1)',      // estándar
} as const

// ─── Page entrance: fade + translateY ───
export function animatePageIn(element: HTMLElement) {
  anime({
    targets: element,
    opacity: [0, 1],
    translateY: [12, 0],
    duration: 400,
    easing: EASING.enter,
  })
}

// ─── Card stagger entrance ───
export function animateCardStagger(container: HTMLElement, delay = 40) {
  const cards = container.querySelectorAll('[data-animate="card"]')
  if (!cards.length) return
  
  anime({
    targets: cards,
    opacity: [0, 1],
    translateY: [16, 0],
    scale: [0.97, 1],
    duration: 350,
    delay: anime.stagger(delay, { start: 50 }),
    easing: EASING.enter,
  })
}

// ─── List item stagger entrance ───
export function animateListStagger(container: HTMLElement, delay = 30) {
  const items = container.querySelectorAll('[data-animate="list-item"]')
  if (!items.length) return
  
  anime({
    targets: items,
    opacity: [0, 1],
    translateX: [-8, 0],
    duration: 300,
    delay: anime.stagger(delay, { start: 30 }),
    easing: EASING.enter,
  })
}

// ─── Stat counter: count up ───
export function animateCounter(
  element: HTMLElement,
  from: number,
  to: number,
  duration = 600,
) {
  // Si el elemento contiene texto con formato, preservamos el sufijo
  const originalText = element.textContent || ''
  const suffix = originalText.replace(/[\d,.\s]/g, '')

  return anime({
    targets: { value: from },
    value: to,
    duration,
    easing: EASING.smooth,
    round: 1,
    update: (anim) => {
      element.textContent = `${Math.round(anim.animations[0].currentValue as number)}${suffix}`
    },
  })
}

// ─── Modal entrance: scale + fade from center ───
export function animateModalIn(overlay: HTMLElement, content: HTMLElement) {
  const tl = anime.timeline({ easing: EASING.smooth })
  
  tl.add({
    targets: overlay,
    opacity: [0, 1],
    duration: 200,
  }).add({
    targets: content,
    opacity: [0, 1],
    scale: [0.92, 1],
    translateY: [12, 0],
    duration: 300,
    easing: EASING.spring,
  }, '-=100')
}

// ─── Modal exit ───
export function animateModalOut(overlay: HTMLElement, content: HTMLElement) {
  const tl = anime.timeline({ easing: EASING.exit })
  
  tl.add({
    targets: content,
    opacity: [1, 0],
    scale: [1, 0.95],
    duration: 150,
  }).add({
    targets: overlay,
    opacity: [1, 0],
    duration: 100,
  }, '-=50')
}

// ─── Card hover: scale up (attach to onMouseEnter/Leave) ───
export function animateCardHoverIn(el: HTMLElement) {
  anime({
    targets: el,
    scale: 1.02,
    duration: 200,
    easing: EASING.smooth,
  })
}

export function animateCardHoverOut(el: HTMLElement) {
  anime({
    targets: el,
    scale: 1,
    duration: 200,
    easing: EASING.smooth,
  })
}

// ─── Toast slide-in ───
export function animateToastIn(element: HTMLElement) {
  anime({
    targets: element,
    translateX: [80, 0],
    opacity: [0, 1],
    duration: 300,
    easing: EASING.spring,
  })
}

export function animateToastOut(element: HTMLElement) {
  return anime({
    targets: element,
    translateX: [0, 80],
    opacity: [1, 0],
    duration: 200,
    easing: EASING.exit,
  })
}

// ─── Calendar day highlight pulse (replaces old CSS animation) ───
export function animateDayHighlight(element: HTMLElement) {
  anime({
    targets: element,
    boxShadow: [
      '0 0 0 0 rgba(0, 188, 158, 0.4)',
      '0 0 0 8px rgba(0, 188, 158, 0)',
    ],
    duration: 800,
    easing: EASING.smooth,
  })
}

// ─── Skeleton shimmer (pure CSS, pero lo exponemos aquí) ───
// Usar animate-pulse de Tailwind es suficiente. Esta función es placeholder
// para cuando queramos un shimmer más elaborado.
export function shimmerCSS() {
  return 'bg-gradient-to-r from-surface-muted via-rule/30 to-surface-muted bg-[length:200%_100%] animate-[shimmer_1.5s_infinite]'
}
