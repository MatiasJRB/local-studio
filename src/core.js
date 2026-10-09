export function fitRect(sw, sh, w, h) {
  const scale = Math.min(w / sw, h / sh);
  return {
    x: (w - sw * scale) / 2,
    y: (h - sh * scale) / 2,
    w: sw * scale,
    h: sh * scale,
  };
}
export function cameraRect(w, h, size, corner) {
  const d = h * size,
    p = h * 0.025;
  return {
    x: corner.includes("left") ? p : w - d - p,
    y: corner.includes("top") ? p : h - d - p,
    d,
  };
}
export function clampCamera(w, h, position, size) {
  const d = h * Math.min(0.65, Math.max(0.12, size));
  return {
    x: Math.min(w - d, Math.max(0, position.x * w)),
    y: Math.min(h - d, Math.max(0, position.y * h)),
    d,
  };
}
export function resizeCamera(w, h, rect, delta) {
  const d = Math.min(
    h * 0.65,
    w - rect.x,
    h - rect.y,
    Math.max(h * 0.12, rect.d + delta),
  );
  return { x: rect.x, y: rect.y, d };
}
export function rgba(hex, opacity) {
  return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${Math.min(1, Math.max(0, opacity))})`;
}
export class TakeWriter {
  constructor(Recorder = globalThis.MediaRecorder) {
    this.Recorder = Recorder;
    this.state = "idle";
  }
  start(
    stream,
    {
      writer = null,
      onDone = () => {},
      onError = () => {},
      onBytes = () => {},
    } = {},
  ) {
    if (this.state === "recording" || this.state === "finishing")
      throw new Error("Recording already active");
    const mimeType = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ].find((t) => this.Recorder.isTypeSupported(t));
    if (!mimeType) throw new Error("WebM recording unavailable");
    this.recorder = new this.Recorder(stream, {
      mimeType,
      videoBitsPerSecond: 6500000,
      audioBitsPerSecond: 192000,
    });
    this.state = "recording";
    this.bytes = 0;
    this.chunks = [];
    this.queue = Promise.resolve();
    this.failure = null;
    this.done = new Promise((resolve) => (this.resolve = resolve));
    this.recorder.ondataavailable = (e) => {
      if (!e.data.size) return;
      this.bytes += e.data.size;
      onBytes(this.bytes);
      if (writer)
        this.queue = this.queue
          .then(() => writer.write(e.data))
          .catch((err) => {
            this.failure = err;
            onError(err);
            this.stop();
          });
      else this.chunks.push(e.data);
    };
    this.recorder.onerror = (e) => {
      this.failure = e.error || new Error("Recorder failed");
      onError(this.failure);
      this.stop();
    };
    this.recorder.onstop = async () => {
      await this.queue;
      let result = null;
      try {
        if (writer) await writer.close();
        if (!this.bytes) throw new Error("Empty recording");
        result = {
          blob: writer ? null : new Blob(this.chunks, { type: mimeType }),
          bytes: this.bytes,
          mimeType,
          partial: Boolean(this.failure),
        };
        onDone(result);
      } catch (err) {
        this.failure = err;
        onError(err);
      } finally {
        this.state = "complete";
        this.chunks = [];
        this.resolve(result);
      }
    };
    try {
      this.recorder.start(2000);
    } catch (err) {
      this.state = "idle";
      if (writer) writer.abort().catch(() => {});
      throw err;
    }
  }
  stop() {
    if (this.state === "recording") {
      this.state = "finishing";
      if (this.recorder.state !== "inactive") this.recorder.stop();
    }
    return this.done || Promise.resolve(null);
  }
}
