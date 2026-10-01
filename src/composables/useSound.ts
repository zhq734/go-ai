/**
 * 轻量音效：使用 WebAudio 合成落子/提子/终局音，无需外部音频资源。
 * 创建者：zhenghq
 */
import { ref } from 'vue'

let audioContext: AudioContext | null = null
const enabled = ref(true)

/**
 * 获取（或创建）音频上下文。
 * @returns 音频上下文；环境不支持时返回 null。
 */
function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioContext) audioContext = new Ctor()
  if (audioContext.state === 'suspended') void audioContext.resume()
  return audioContext
}

/**
 * 播放一段简单的合成音。
 * @param frequency 频率（赫兹）。
 * @param duration 持续时间（秒）。
 * @param type 波形类型。
 * @param gain 音量。
 */
function beep(frequency: number, duration: number, type: OscillatorType, gain: number): void {
  if (!enabled.value) return
  const context = getContext()
  if (!context) return
  const oscillator = context.createOscillator()
  const volume = context.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency
  volume.gain.setValueAtTime(0, context.currentTime)
  volume.gain.linearRampToValueAtTime(gain, context.currentTime + 0.008)
  volume.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration)
  oscillator.connect(volume).connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + duration + 0.02)
}

/** 音效组合式函数。 */
export function useSound() {
  /**
   * 设置音效开关。
   * @param value 是否开启。
   */
  function setEnabled(value: boolean): void {
    enabled.value = value
  }

  /** 播放落子音。 */
  function playPlace(): void {
    beep(660, 0.09, 'triangle', 0.16)
    beep(220, 0.07, 'sine', 0.1)
  }

  /** 播放提子音。 */
  function playCapture(): void {
    beep(520, 0.12, 'square', 0.1)
    window.setTimeout(() => beep(340, 0.14, 'triangle', 0.12), 60)
  }

  /** 播放终局音。 */
  function playFinish(): void {
    beep(523, 0.16, 'sine', 0.14)
    window.setTimeout(() => beep(659, 0.16, 'sine', 0.14), 130)
    window.setTimeout(() => beep(784, 0.26, 'sine', 0.14), 260)
  }

  return { enabled, setEnabled, playPlace, playCapture, playFinish }
}
