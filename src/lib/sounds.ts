import { Howl } from 'howler'

// Sound effect URLs (using free sound effects - these are placeholder URLs)
// In production, replace with actual hosted audio files
const sounds: Record<string, Howl | null> = {}

const SOUND_CONFIG: Record<string, { src: string; volume: number }> = {
  click: { src: '/sounds/click.mp3', volume: 0.3 },
  correct: { src: '/sounds/correct.mp3', volume: 0.4 },
  incorrect: { src: '/sounds/incorrect.mp3', volume: 0.3 },
  unlock: { src: '/sounds/unlock.mp3', volume: 0.5 },
  reveal: { src: '/sounds/reveal.mp3', volume: 0.4 },
  verify: { src: '/sounds/verify.mp3', volume: 0.4 },
  success: { src: '/sounds/success.mp3', volume: 0.5 },
  reject: { src: '/sounds/reject.mp3', volume: 0.3 },
  transition: { src: '/sounds/transition.mp3', volume: 0.2 },
}

let soundEnabled = localStorage.getItem('mystiq_sound') !== 'false'

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled
  localStorage.setItem('mystiq_sound', String(enabled))
}

export function playSound(name: keyof typeof SOUND_CONFIG) {
  if (!soundEnabled) return

  try {
    if (!sounds[name]) {
      const config = SOUND_CONFIG[name]
      if (!config) return
      sounds[name] = new Howl({
        src: [config.src],
        volume: config.volume,
        preload: true,
      })
    }
    sounds[name]?.play()
  } catch {
    // Silently fail if sound can't play
  }
}

// Preload sounds
export function preloadSounds() {
  Object.keys(SOUND_CONFIG).forEach((key) => {
    try {
      const config = SOUND_CONFIG[key]
      sounds[key] = new Howl({
        src: [config.src],
        volume: config.volume,
        preload: true,
      })
    } catch {
      // Silently fail
    }
  })
}
