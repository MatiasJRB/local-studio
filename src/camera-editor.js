import { cameraRect, clampCamera, resizeCamera } from "./core.js";
export const cameraEditor = (function () {
  const $ = (id) => document.getElementById(id),
    canvas = $("stage"),
    overlay = $("camera-edit");
  const key = document.body.dataset.editorStorage || "local-studio-camera-v1";
  let position = null,
    gesture = null;
  const ids = [
    "size",
    "mirror",
    "shape",
    "border-color",
    "border-width",
    "border-opacity",
    "shadow-on",
    "shadow-color",
    "shadow-opacity",
    "shadow-blur",
    "shadow-x",
    "shadow-y",
  ];
  function rect() {
    return clampCamera(
      canvas.width,
      canvas.height,
      position || { x: 0, y: 0 },
      +$("size").value,
    );
  }
  function assign(r) {
    position = { x: r.x / canvas.width, y: r.y / canvas.height };
    $("size").value = r.d / canvas.height;
    $("corner").value = "custom";
    sync();
  }
  function corner() {
    const r = cameraRect(
      canvas.width,
      canvas.height,
      +$("size").value,
      $("corner").value,
    );
    position = { x: r.x / canvas.width, y: r.y / canvas.height };
    sync();
    save();
  }
  function save() {
    try {
      const controls = {};
      for (const id of ids)
        controls[id] = $(id).type === "checkbox" ? $(id).checked : $(id).value;
      localStorage.setItem(key, JSON.stringify({ position, controls }));
    } catch {
      /* Storage can be unavailable in private browsing; editing remains usable. */
    }
  }
  function sync() {
    const r = rect();
    overlay.style.left = (r.x / canvas.width) * 100 + "%";
    overlay.style.top = (r.y / canvas.height) * 100 + "%";
    overlay.style.width = (r.d / canvas.width) * 100 + "%";
    overlay.style.height = (r.d / canvas.height) * 100 + "%";
    overlay.dataset.shape = $("shape").value;
    for (const id of [
      "border-width",
      "border-opacity",
      "shadow-opacity",
      "shadow-blur",
      "shadow-x",
      "shadow-y",
    ])
      $(id + "-value").textContent = id.includes("opacity")
        ? Math.round(+$(id).value * 100) + "%"
        : $(id).value + " px";
  }
  function begin(event, resize) {
    if (event.button !== 0) return;
    event.preventDefault();
    const bounds = canvas.getBoundingClientRect();
    gesture = {
      id: event.pointerId,
      resize,
      r: rect(),
      x: event.clientX,
      y: event.clientY,
      bounds,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event) {
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx =
        ((event.clientX - gesture.x) * canvas.width) / gesture.bounds.width,
      dy =
        ((event.clientY - gesture.y) * canvas.height) / gesture.bounds.height;
    const r = gesture.resize
      ? resizeCamera(
          canvas.width,
          canvas.height,
          gesture.r,
          Math.abs(dx) > Math.abs(dy) ? dx : dy,
        )
      : clampCamera(
          canvas.width,
          canvas.height,
          {
            x: (gesture.r.x + dx) / canvas.width,
            y: (gesture.r.y + dy) / canvas.height,
          },
          gesture.r.d / canvas.height,
        );
    assign(r);
  }
  function end(event) {
    if (gesture?.id !== event.pointerId) return;
    gesture = null;
    save();
  }
  for (const [id, resize] of [
    ["camera-move", false],
    ["camera-resize", true],
  ]) {
    const button = $(id);
    button.onpointerdown = (e) => begin(e, resize);
    button.onpointermove = move;
    button.onpointerup = end;
    button.onpointercancel = end;
    button.onlostpointercapture = end;
    button.onkeydown = (e) => {
      const directions = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      if (!directions[e.key]) return;
      e.preventDefault();
      const step = e.shiftKey ? 20 : 4,
        [dx, dy] = directions[e.key],
        r = rect();
      assign(
        resize
          ? resizeCamera(canvas.width, canvas.height, r, (dx || dy) * step)
          : clampCamera(
              canvas.width,
              canvas.height,
              {
                x: (r.x + dx * step) / canvas.width,
                y: (r.y + dy * step) / canvas.height,
              },
              r.d / canvas.height,
            ),
      );
      save();
    };
  }
  $("corner").onchange = corner;
  for (const id of ids)
    $(id).addEventListener("input", () => {
      if (id === "size") {
        const r = rect();
        position = { x: r.x / canvas.width, y: r.y / canvas.height };
      }
      sync();
      save();
    });
  $("reset-camera").onclick = () => {
    const defaults = {
      size: ".28",
      mirror: true,
      shape: "circle",
      "border-color": "#f7f3ec",
      "border-width": "3",
      "border-opacity": "1",
      "shadow-on": false,
      "shadow-color": "#000000",
      "shadow-opacity": ".45",
      "shadow-blur": "20",
      "shadow-x": "0",
      "shadow-y": "10",
    };
    for (const [id, value] of Object.entries(defaults))
      if (typeof value === "boolean") $(id).checked = value;
      else $(id).value = value;
    $("corner").value = "bottom-right";
    corner();
  };
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (
      saved?.position &&
      Number.isFinite(saved.position.x) &&
      Number.isFinite(saved.position.y)
    ) {
      position = saved.position;
      for (const id of ids) {
        const v = saved.controls?.[id];
        if (v === undefined) continue;
        if ($(id).type === "checkbox") $(id).checked = Boolean(v);
        else $(id).value = String(v);
      }
      if (!$("shape").value) $("shape").value = "circle";
      $("corner").value = "custom";
    }
  } catch {
    /* Storage can be unavailable in private browsing; editing remains usable. */
  }
  if (!position) corner();
  else sync();
  return {
    rect,
    sync,
    setVisible: (visible) => (overlay.hidden = !visible),
    style: () => ({
      shape: $("shape").value,
      borderColor: $("border-color").value,
      borderWidth: +$("border-width").value,
      borderOpacity: +$("border-opacity").value,
      shadowOn: $("shadow-on").checked,
      shadowColor: $("shadow-color").value,
      shadowOpacity: +$("shadow-opacity").value,
      shadowBlur: +$("shadow-blur").value,
      shadowX: +$("shadow-x").value,
      shadowY: +$("shadow-y").value,
    }),
  };
})();
