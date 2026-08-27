import assert from "node:assert/strict";
import test from "node:test";
import { playAudioReliably } from "./mediaPlayback.js";

class FakeAudio {
  constructor() {
    this.currentTime = 0;
    this.duration = 8;
    this.ended = false;
    this.playCount = 0;
  }
  play() {
    this.playCount += 1;
    return Promise.resolve();
  }
  pause() {}
  load() {}
  removeAttribute(name) {
    if (name === "src") this.src = "";
  }
}

test("a mobile pause retries the active narration", async () => {
  const audio = new FakeAudio();
  const cancel = playAudioReliably(audio, "/host.mp3", () => {});
  audio.currentTime = 2;
  audio.onpause();
  await new Promise((resolve) => setTimeout(resolve, 340));
  assert.equal(audio.playCount, 2);
  cancel();
});

test("an ended event advances exactly once", () => {
  const audio = new FakeAudio();
  let advances = 0;
  playAudioReliably(audio, "/host.mp3", () => { advances += 1; });
  const ended = audio.onended;
  ended();
  ended();
  assert.equal(advances, 1);
});

test("starting a new clip cancels the old clip callbacks", () => {
  const audio = new FakeAudio();
  let oldAdvances = 0;
  let newAdvances = 0;
  playAudioReliably(audio, "/old.mp3", () => { oldAdvances += 1; });
  const oldEnded = audio.onended;
  playAudioReliably(audio, "/new.mp3", () => { newAdvances += 1; });
  oldEnded();
  audio.onended();
  assert.equal(oldAdvances, 0);
  assert.equal(newAdvances, 1);
});
