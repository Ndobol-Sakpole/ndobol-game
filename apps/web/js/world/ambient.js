export function createAmbient() {
  let context, source, gain;
  return {
    async setEnabled(enabled) {
      if (enabled && !context) {
        context = new AudioContext();
        const buffer = context.createBuffer(
            1,
            context.sampleRate * 3,
            context.sampleRate,
          ),
          data = buffer.getChannelData(0);
        let previous = 0;
        for (let i = 0; i < data.length; i++) {
          previous = (previous + (Math.random() * 2 - 1) * 0.025) / 1.025;
          data[i] = previous * 6;
        }
        source = context.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 750;
        gain = context.createGain();
        gain.gain.value = 0;
        source.connect(filter).connect(gain).connect(context.destination);
        source.start();
      }
      if (context) {
        await context.resume();
        gain.gain.setTargetAtTime(enabled ? 0.18 : 0, context.currentTime, 0.4);
      }
    },
    dispose() {
      source?.stop();
      context?.close();
    },
  };
}
