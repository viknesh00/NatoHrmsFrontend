let audioContext: AudioContext | undefined;

export async function playChime(frequencies: readonly number[], spacing = 0.085, shouldStart = () => true) {
  try {
    const AudioContextConstructor = window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    const context = audioContext ??= new AudioContextConstructor();
    if (context.state !== "running") await context.resume();

    if (!shouldStart()) return;

    const start = context.currentTime;
    const noteLength = spacing * 0.94;
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const at = start + index * spacing;

      oscillator.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.035, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + noteLength);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(at);
      oscillator.stop(at + noteLength);
    });
  } catch {
    // Audio is optional on browsers that block it or lack Web Audio.
  }
}
