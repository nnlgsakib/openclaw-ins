/**
 * Animation Utilities
 *
 * Centralized animation timing, easing, and spring physics presets
 * for consistent motion across the application.
 *
 * @example
 * ```ts
 * import { animationTiming, springPresets, getTransition } from '@/lib/animation'
 *
 * // CSS transition
 * style={{ transition: getTransition(animationTiming.fast) }}
 *
 * // Spring-based animation (use with animation libraries)
 * const config = springPresets.gentle
 * ```
 */

/**
 * Standard animation timing presets in milliseconds.
 *
 * - `fast` (150ms): Micro-interactions, hover states, toggles
 * - `moderate` (300ms): Panel transitions, card reveals, dropdowns
 * - `slow` (450ms): Page transitions, large layout shifts, modals
 */
export const animationTiming = {
  /** 150ms — micro-interactions, hover states, toggles */
  fast: 150,
  /** 300ms — panel transitions, card reveals, dropdowns */
  moderate: 300,
  /** 450ms — page transitions, large layout shifts, modals */
  slow: 450,
} as const

/**
 * Spring physics presets for natural-feeling animations.
 *
 * Each preset defines stiffness and damping values for spring-based motion:
 * - `gentle`: Smooth, slow settle — good for panels and large elements
 * - `bouncy`: Playful overshoot — good for buttons and interactive elements
 * - `stable`: Quick settle, no overshoot — good for data updates and status changes
 */
export const springPresets = {
  gentle: { type: 'spring' as const, stiffness: 200, damping: 20 },
  bouncy: { type: 'spring' as const, stiffness: 300, damping: 10 },
  stable: { type: 'spring' as const, stiffness: 400, damping: 30 },
} as const

/**
 * Generate a CSS transition string or spring configuration object.
 *
 * @param duration - Transition duration in milliseconds (default: 300)
 * @param property - CSS property to animate (default: 'all')
 * @param easing - CSS easing function (default: 'ease-in-out')
 * @returns CSS transition string
 *
 * @example
 * ```ts
 * // Default transition
 * getTransition() // 'all 300ms ease-in-out'
 *
 * // Custom duration
 * getTransition(animationTiming.fast) // 'all 150ms ease-in-out'
 *
 * // Specific property
 * getTransition(animationTiming.moderate, 'opacity') // 'opacity 300ms ease-in-out'
 *
 * // Custom easing
 * getTransition(animationTiming.slow, 'transform', 'ease-out') // 'transform 450ms ease-out'
 * ```
 */
export function getTransition(
  duration: number = animationTiming.moderate,
  property: string = 'all',
  easing: string = 'ease-in-out',
): string {
  return `${property} ${duration}ms ${easing}`
}
