export function installSyntheticSources() {
  window.syntheticAudioContexts = [];
  function videoSource(camera) {
    const canvas = document.createElement("canvas");
    canvas.width = camera ? 640 : 1440;
    canvas.height = camera ? 480 : 900;
    const ctx = canvas.getContext("2d");
    let frame = 0;
    setInterval(() => {
      frame++;
      ctx.fillStyle = camera ? "#e8a15e" : "#133b60";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ffffff";
      ctx.font = "60px sans-serif";
      ctx.fillText(camera ? "CAMERA TEST" : `SCREEN TEST ${frame}`, 30, 110);
      ctx.fillStyle = "#96dec4";
      ctx.fillRect((frame * 11) % (canvas.width - 100), 200, 100, 100);
    }, 33);
    return canvas.captureStream(30);
  }
  async function tone(stream, hz) {
    const audio = new AudioContext();
    window.syntheticAudioContexts.push(audio);

    await audio.resume();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    const destination = audio.createMediaStreamDestination();
    oscillator.frequency.value = hz;
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(destination);
    // Keep the synthetic graph clock active in isolated headless browsers without playing a tone.
    const silentSink = audio.createGain();
    silentSink.gain.value = 0;
    gain.connect(silentSink);
    silentSink.connect(audio.destination);
    oscillator.start();
    destination.stream
      .getAudioTracks()
      .forEach((track) => stream.addTrack(track));
    return stream;
  }
  Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
    configurable: true,
    value: async () =>
      window.syntheticAudioEnabled
        ? tone(videoSource(false), 440)
        : videoSource(false),
  });
  Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
    value: async (options) => {
      const stream = options.video ? videoSource(true) : new MediaStream();
      return options.audio ? tone(stream, 880) : stream;
    },
  });
  Object.defineProperty(navigator.mediaDevices, "enumerateDevices", {
    value: async () => [],
  });
  window.showSaveFilePicker = undefined;
}
