import { useReducedMotion } from 'framer-motion'

export default function FilmGrain() {
  const prefersReducedMotion = useReducedMotion()
  if (prefersReducedMotion) return null

  return <div className="film-grain" aria-hidden="true" />
}
