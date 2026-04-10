import type { ClassificationResult } from '@/types';

export type VoiceLang = 'en-IN' | 'hi-IN';

export function speak(text: string, lang: VoiceLang = 'hi-IN'): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = lang === 'hi-IN' ? 0.85 : 0.9;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  if (typeof window === 'undefined') return false;
  return window.speechSynthesis.speaking;
}

export function buildSpeechText(result: ClassificationResult, lang: 'en' | 'hi'): string {
  if (lang === 'hi') {
    return `${result.item_name}। ${result.hindi_instruction} आपको ${result.points_earned} ईको पॉइंट मिले।`;
  }
  return `This is ${result.item_name}. It is ${result.category} waste. ${result.disposal_steps[0]}. You earned ${result.points_earned} EcoPoints!`;
}
