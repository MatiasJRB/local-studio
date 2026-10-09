import { fitRect, rgba, TakeWriter } from "./core.js";
import { cameraEditor } from "./camera-editor.js";
const $ = (id) => document.getElementById(id),
  canvas = $("stage"),
  ctx = canvas.getContext("2d"),
  sv = $("screen-video"),
  cv = $("camera-video");
const captureSupported = Boolean(
  navigator.mediaDevices?.getDisplayMedia && window.MediaRecorder,
);
let screenStream = null,
  deviceStream = null,
  audio = null,
  output = null,
  recording = null,
  busy = false,
  started = 0,
  url = null,
  handle = null,
  unsaved = false,
  drawTimer = null,
  wake = null;
let audioNodes = [],
  meters = [];
function status(text) {
  $("status").textContent = text;
}
function locked() {
  return (
    busy || recording?.state === "recording" || recording?.state === "finishing"
  );
}
function refresh() {
  const lock = locked();
  $("screen").disabled = lock || !captureSupported;
  $("devices").disabled = lock;
  $("quality").disabled = lock;
  ["want-camera", "want-mic", "mic-device", "camera-device"].forEach(
    (id) => ($(id).disabled = lock),
  );
  $("record").disabled =
    lock ||
    !screenStream ||
    !screenStream.getVideoTracks().some((t) => t.readyState === "live");
  $("stop").disabled = !recording || recording.state !== "recording";
  $("release").disabled = lock;
  $("status").dataset.recording = Boolean(recording?.state === "recording");
}
function release(s) {
  s?.getTracks().forEach((t) => t.stop());
}
function draw() {
  const w = canvas.width,
    h = canvas.height;
  ctx.fillStyle = "#080e0b";
  ctx.fillRect(0, 0, w, h);
  if (sv.readyState >= 2 && screenStream) {
    const r = fitRect(sv.videoWidth, sv.videoHeight, w, h);
    ctx.drawImage(sv, r.x, r.y, r.w, r.h);
  } else {
    ctx.fillStyle = "#b2c8bd";
    ctx.font = `${h * 0.025}px Jakarta, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("Tu pantalla aparece acá", w / 2, h / 2);
  }
  const cameraVisible =
    cv.readyState >= 2 &&
    deviceStream?.getVideoTracks().length &&
    $("want-camera").checked;
  cameraEditor.setVisible(cameraVisible);
  cameraEditor.sync();
  if (cameraVisible) {
    const r = cameraEditor.rect(),
      style = cameraEditor.style(),
      scale = h / 1080,
      side = Math.min(cv.videoWidth, cv.videoHeight);
    const path = (inset = 0) => {
      ctx.beginPath();
      if (style.shape === "rounded")
        ctx.roundRect(
          r.x + inset,
          r.y + inset,
          r.d - inset * 2,
          r.d - inset * 2,
          r.d * 0.14,
        );
      else
        ctx.arc(r.x + r.d / 2, r.y + r.d / 2, r.d / 2 - inset, 0, Math.PI * 2);
    };
    if (style.shadowOn) {
      ctx.save();
      ctx.shadowColor = rgba(style.shadowColor, style.shadowOpacity);
      ctx.shadowBlur = style.shadowBlur * scale;
      ctx.shadowOffsetX = style.shadowX * scale;
      ctx.shadowOffsetY = style.shadowY * scale;
      ctx.fillStyle = "#080e0b";
      path();
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    path();
    ctx.clip();
    if ($("mirror").checked) {
      ctx.translate(r.x + r.d, r.y);
      ctx.scale(-1, 1);
    } else ctx.translate(r.x, r.y);
    ctx.drawImage(
      cv,
      (cv.videoWidth - side) / 2,
      (cv.videoHeight - side) / 2,
      side,
      side,
      0,
      0,
      r.d,
      r.d,
    );
    ctx.restore();
    if (style.borderWidth > 0) {
      ctx.strokeStyle = rgba(style.borderColor, style.borderOpacity);
      ctx.lineWidth = style.borderWidth * scale;
      path(ctx.lineWidth / 2);
      ctx.stroke();
    }
  }
  const elapsed =
    recording?.state === "recording"
      ? Math.floor((performance.now() - started) / 1000)
      : 0;
  if (recording?.state === "recording")
    $("clock").textContent = [
      Math.floor(elapsed / 3600),
      Math.floor(elapsed / 60) % 60,
      elapsed % 60,
    ]
      .map((x) => String(x).padStart(2, "0"))
      .join(":");
  for (const { analyser, meter } of meters) {
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    meter.value = Math.min(
      1,
      Math.sqrt(
        data.reduce((s, x) => s + ((x - 128) / 128) ** 2, 0) / data.length,
      ) * 4,
    );
  }
}
// A timer keeps the compositor running when another window has focus; rAF stops in hidden tabs.
drawTimer = setInterval(draw, 1000 / 30);
draw();
async function resetAudio() {
  audioNodes.forEach((n) => n.disconnect());
  audioNodes = [];
  meters = [];
  if (audio) await audio.close();
  audio = null;
  $("mic-meter").value = 0;
  $("source-meter").value = 0;
}
async function prepareAudio() {
  await resetAudio();
  const sources = [screenStream, deviceStream].filter(
    (stream) => stream?.getAudioTracks().length,
  );
  if (!sources.length) return new MediaStream();
  audio = new AudioContext();
  await audio.resume();
  const dest = audio.createMediaStreamDestination();
  for (const [stream, id] of [
    [screenStream, "source-meter"],
    [deviceStream, "mic-meter"],
  ]) {
    if (!stream?.getAudioTracks().length) continue;
    const source = audio.createMediaStreamSource(
        new MediaStream(stream.getAudioTracks()),
      ),
      analyser = audio.createAnalyser();
    analyser.fftSize = 256;
    const gain = audio.createGain();
    gain.gain.value = 0.85;
    source.connect(analyser);
    source.connect(gain);
    gain.connect(dest);
    audioNodes.push(source, analyser, gain);
    meters.push({ analyser, meter: $(id) });
  }
  return dest.stream;
}
function message(error) {
  return error.name === "NotAllowedError"
    ? "Permiso no concedido. Volvé a elegir la fuente o revisá los permisos de Chrome en macOS."
    : error.name === "NotFoundError"
      ? "No se encontró el dispositivo. Elegí otro o desactivá cámara/micrófono."
      : error.name === "AbortError"
        ? "Selección cancelada. No comenzó ninguna grabación."
        : error.message;
}
$("screen").onclick = async () => {
  if (locked()) return;
  busy = true;
  refresh();
  try {
    const s = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 30 },
      },
      audio: { suppressLocalAudioPlayback: false },
      systemAudio: "include",
      selfBrowserSurface: "exclude",
      surfaceSwitching: "exclude",
    });
    release(screenStream);
    screenStream = s;
    sv.srcObject = s;
    await sv.play();
    s.getVideoTracks()[0].onended = () => {
      if (screenStream !== s) return;
      if (recording?.state === "recording")
        stopTake("La fuente dejó de compartirse.");
      else {
        screenStream = null;
        sv.srcObject = null;
        status("La fuente dejó de compartirse. Elegí otra.");
        refresh();
      }
    };
    $("screen-state").textContent = "Conectada: " + s.getVideoTracks()[0].label;
    $("source-audio").textContent = s.getAudioTracks().length
      ? "Audio de la fuente conectado. Reproducí el video y comprobá el medidor."
      : "Sin audio de la fuente. Para una reacción, elegí una pestaña de Chrome y marcá Compartir audio.";
    await prepareAudio();
    status(
      "Pantalla lista. Prepará cámara y micrófono o grabá sólo la pantalla.",
    );
  } catch (e) {
    status(message(e));
  } finally {
    busy = false;
    refresh();
  }
};
async function populateDevices() {
  const list = await navigator.mediaDevices.enumerateDevices();
  for (const [id, kind] of [
    ["mic-device", "audioinput"],
    ["camera-device", "videoinput"],
  ]) {
    const selected = $(id).value;
    $(id).replaceChildren(new Option("Predeterminado", ""));
    for (const d of list.filter((d) => d.kind === kind))
      $(id).add(new Option(d.label || "Dispositivo", d.deviceId));
    if ([...$(id).options].some((o) => o.value === selected))
      $(id).value = selected;
  }
}
$("devices").onclick = async () => {
  if (locked()) return;
  busy = true;
  refresh();
  try {
    const video = $("want-camera").checked,
      a = $("want-mic").checked;
    let s = null;
    if (video || a)
      s = await navigator.mediaDevices.getUserMedia({
        video: video
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
              ...($("camera-device").value
                ? { deviceId: { exact: $("camera-device").value } }
                : {}),
            }
          : false,
        audio: a
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              ...($("mic-device").value
                ? { deviceId: { exact: $("mic-device").value } }
                : {}),
            }
          : false,
      });
    release(deviceStream);
    deviceStream = s;
    cv.srcObject = s;
    if (video) await cv.play();
    await populateDevices();
    await prepareAudio();
    $("device-state").textContent =
      (video ? "Cámara conectada" : "Sin cámara") +
      " · " +
      (a ? "Micrófono conectado" : "Sin micrófono");
    s?.getTracks().forEach(
      (t) =>
        (t.onended = () => {
          if (deviceStream !== s) return;
          $("device-state").textContent = "Un dispositivo se desconectó.";
          if (recording?.state === "recording")
            stopTake("Se desconectó cámara o micrófono.");
          else
            status(
              "Un dispositivo se desconectó. Prepará las fuentes otra vez.",
            );
        }),
    );
    status(
      "Fuentes preparadas. Comprobá el encuadre y los medidores antes de grabar.",
    );
  } catch (e) {
    status(message(e));
  } finally {
    busy = false;
    refresh();
  }
};
for (const id of ["want-camera", "want-mic", "mic-device", "camera-device"])
  $(id).onchange = async () => {
    release(deviceStream);
    deviceStream = null;
    cv.srcObject = null;
    await prepareAudio();
    $("device-state").textContent =
      "Cambiaste dispositivos. Tocá Preparar cámara y micrófono para conectarlos.";
  };
$("quality").onchange = () => {
  const h = +$("quality").value;
  canvas.height = h;
  canvas.width = (h * 16) / 9;
  $("format").textContent = `${canvas.width} × ${h} · 16:9 · 30 fps objetivo`;
};
$("record").onclick = async () => {
  if (locked() || !screenStream) return;
  if (
    ($("want-camera").checked && !deviceStream?.getVideoTracks().length) ||
    ($("want-mic").checked && !deviceStream?.getAudioTracks().length)
  ) {
    status("Primero prepará cámara y micrófono, o desactivá esas fuentes.");
    return;
  }
  busy = true;
  refresh();
  let writer = null;
  handle = null;
  try {
    // The picker must be called directly within the click's user activation.
    if (window.showSaveFilePicker) {
      handle = await showSaveFilePicker({
        suggestedName:
          "toma-" + new Date().toISOString().replace(/[:.]/g, "-") + ".webm",
        types: [
          { description: "Video WebM", accept: { "video/webm": [".webm"] } },
        ],
      });
      writer = await handle.createWritable();
    }
    const mixed = await prepareAudio();
    output = canvas.captureStream(30);
    mixed.getAudioTracks().forEach((t) => output.addTrack(t));
    recording = new TakeWriter();
    recording.start(output, {
      writer,
      onBytes: (b) => {
        if (recording?.state === "recording")
          status(
            "Grabando · " +
              (b / 1048576).toFixed(1) +
              " MB · Volvé acá para detener y guardar.",
          );
      },
      onError: (e) => {
        status("La grabación tuvo un error: " + message(e));
        if (recording?.state === "recording")
          stopTake("La grabación tuvo un error.");
      },
      onDone: showResult,
    });
    started = performance.now();
    unsaved = true;
    $("result").hidden = true;
    status("Grabando. Volvé acá para detener y guardar.");
    try {
      wake = await navigator.wakeLock?.request("screen");
    } catch {
      /* Wake lock is optional; the user can keep the device awake manually. */
    }
  } catch (e) {
    if (writer && recording?.state !== "recording")
      await writer.abort().catch(() => {});
    release(output);
    output = null;
    status(message(e));
  } finally {
    busy = false;
    refresh();
  }
};
async function stopTake(reason = "") {
  if (!recording || recording.state !== "recording") return;
  status(
    (reason ? reason + " " : "") +
      "Finalizando archivo… No cierres esta pestaña.",
  );
  const done = recording.stop();
  refresh();
  await done;
  release(output);
  output = null;
  release(screenStream);
  release(deviceStream);
  screenStream = deviceStream = null;
  sv.srcObject = cv.srcObject = null;
  await resetAudio();
  await wake?.release().catch(() => {});
  wake = null;
  $("screen-state").textContent = "Pantalla desconectada.";
  $("device-state").textContent = "Cámara y micrófono apagados.";
  refresh();
}
$("stop").onclick = () => stopTake();
async function showSavedFile() {
  try {
    const file = await handle.getFile();
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(file);
    $("playback").src = url;
    $("playback").hidden = false;
  } catch (e) {
    status(message(e));
  }
}
function showResult(result) {
  $("result").hidden = false;
  $("download").hidden = !result.blob;
  $("review-file").hidden = Boolean(result.blob);
  $("result-note").textContent =
    (result.partial ? "Toma parcial; revisá el archivo. " : "") +
    (result.bytes / 1048576).toFixed(1) +
    " MB · " +
    (result.blob
      ? "Descargá antes de cerrar."
      : "Guardada en " + handle.name + ".");
  if (url) URL.revokeObjectURL(url);
  url = null;
  $("playback").hidden = true;
  if (result.blob) {
    url = URL.createObjectURL(result.blob);
    $("download").href = url;
    $("download").download = "toma-" + Date.now() + ".webm";
    $("playback").src = url;
    $("playback").hidden = false;
  } else unsaved = false;
  status(
    result.partial
      ? "Grabación parcial. Revisá imagen y audio antes de usarla."
      : "Toma terminada. Cámara y micrófono se apagan.",
  );
}
$("review-file").onclick = showSavedFile;
$("download").onclick = () => (unsaved = false);
$("release").onclick = async () => {
  if (locked()) return;
  release(screenStream);
  release(deviceStream);
  screenStream = deviceStream = null;
  sv.srcObject = cv.srcObject = null;
  await resetAudio();
  $("screen-state").textContent = "Pantalla desconectada.";
  $("device-state").textContent = "Cámara y micrófono apagados.";
  status("Fuentes apagadas.");
  refresh();
};
window.addEventListener("beforeunload", (e) => {
  if (locked() || unsaved) {
    e.preventDefault();
    e.returnValue = "";
  }
});
window.addEventListener("pagehide", () => {
  release(screenStream);
  release(deviceStream);
  release(output);
  clearInterval(drawTimer);
});
if (!captureSupported) {
  status("Abrí este enlace en Chrome de escritorio para capturar la pantalla.");
  $("screen").disabled = true;
}
if (!window.showSaveFilePicker)
  $("storage").textContent =
    "Este navegador guarda la toma en memoria hasta descargarla. Para tomas largas, abrí el enlace en Chrome y elegí un archivo al comenzar.";
refresh();
