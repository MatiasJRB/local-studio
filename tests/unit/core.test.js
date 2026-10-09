import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fitRect,
  cameraRect,
  clampCamera,
  resizeCamera,
  rgba,
  TakeWriter,
} from "../../src/core.js";
class FakeRecorder {
  static isTypeSupported() {
    return true;
  }
  constructor() {
    this.state = "inactive";
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    queueMicrotask(() => this.onstop());
  }
  chunk(data) {
    this.ondataavailable({ data: new Blob([data]) });
  }
}
test("fit preserves a 16:10 desktop without crop or stretch", () => {
  assert.deepEqual(fitRect(1440, 900, 1920, 1080), {
    x: 96,
    y: 0,
    w: 1728,
    h: 1080,
  });
});
test("camera stays inside every corner at maximum size", () => {
  for (const c of ["top-left", "top-right", "bottom-left", "bottom-right"]) {
    const r = cameraRect(1280, 720, 0.42, c);
    assert(r.x >= 0 && r.y >= 0 && r.x + r.d <= 1280 && r.y + r.d <= 720);
  }
});
test("disk writer serializes chunks and closes after the final write", async () => {
  const events = [];
  const writer = {
    async write(blob) {
      await Promise.resolve();
      events.push(await blob.text());
    },
    async close() {
      events.push("close");
    },
  };
  const take = new TakeWriter(FakeRecorder);
  take.start({}, { writer });
  take.recorder.chunk("a");
  take.recorder.chunk("b");
  const result = await take.stop();
  assert.deepEqual(events, ["a", "b", "close"]);
  assert.equal(result.blob, null);
  assert.equal(result.bytes, 2);
});
test("memory fallback returns a playable container blob", async () => {
  const take = new TakeWriter(FakeRecorder);
  take.start({});
  take.recorder.chunk("data");
  const result = await take.stop();
  assert.equal(await result.blob.text(), "data");
  assert.match(result.mimeType, /webm/);
});
test("duplicate recording starts are rejected", async () => {
  const take = new TakeWriter(FakeRecorder);
  take.start({});
  assert.throws(() => take.start({}), /already active/);
  take.recorder.chunk("a");
  await take.stop();
});
test("write failures stop the recorder and mark a partial take", async () => {
  const errors = [];
  const take = new TakeWriter(FakeRecorder);
  take.start(
    {},
    {
      writer: {
        async write() {
          throw new Error("Disk full");
        },
        async close() {},
      },
      onError: (e) => errors.push(e.message),
    },
  );
  take.recorder.chunk("a");
  const result = await take.done;
  assert.equal(result.partial, true);
  assert.deepEqual(errors, ["Disk full"]);
});
test("empty recording reports an error instead of success", async () => {
  const errors = [];
  const take = new TakeWriter(FakeRecorder);
  take.start({}, { onError: (e) => errors.push(e.message) });
  const result = await take.stop();
  assert.equal(result, null);
  assert.deepEqual(errors, ["Empty recording"]);
});

test("free camera drag clamps every edge and retains proportion at 720p", () => {
  const r = clampCamera(1280, 720, { x: 2, y: -1 }, 0.3);
  assert.equal(r.x, 1064);
  assert.equal(r.y, 0);
  assert.equal(r.d, 216);
});
test("resize cannot extend outside frame or below minimum size", () => {
  const r = { x: 1000, y: 500, d: 150 };
  assert.equal(resizeCamera(1280, 720, r, 1000).d, 220);
  assert.equal(resizeCamera(1280, 720, r, -1000).d, 86.39999999999999);
});
test("border opacity conversion supports fully transparent and opaque colors", () => {
  assert.equal(rgba("#ffffff", 0), "rgba(255,255,255,0)");
  assert.equal(rgba("#ff8000", 1), "rgba(255,128,0,1)");
});
