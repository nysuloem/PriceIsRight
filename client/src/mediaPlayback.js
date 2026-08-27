const activeRuns = new WeakMap();
const activeAudioElements = new Set();

// Called from the user's touch-end gesture. Android Chrome can pause media
// while it owns a scrolling gesture; replaying the same element after the
// finger lifts restores it without creating a competing audio source.
export function resumeActiveAudio() {
  for (const audioEl of activeAudioElements) {
    activeRuns.get(audioEl)?.resume();
  }
}

// Mobile browsers occasionally pause an <audio> element while the page is
// being scrolled or the browser chrome is changing size. Game progression
// must not depend forever on receiving the element's `ended` event.
export function playAudioReliably(audioEl, src, onDone, options = {}) {
  if (!audioEl || !src) {
    onDone();
    return () => {};
  }

  activeRuns.get(audioEl)?.cancel();

  const {
    loadTimeout = 12000,
    errorDelay = 350,
    unknownDurationTimeout = 90000,
    onTimeUpdate,
  } = options;
  let finished = false;
  let loadTimer;
  let playbackTimer;
  let resumeTimer;
  let errorTimer;

  const clearTimers = () => {
    clearTimeout(loadTimer);
    clearTimeout(playbackTimer);
    clearTimeout(resumeTimer);
    clearTimeout(errorTimer);
  };
  const detach = () => {
    audioEl.onended = null;
    audioEl.onerror = null;
    audioEl.onplaying = null;
    audioEl.onloadedmetadata = null;
    audioEl.ontimeupdate = null;
    audioEl.onpause = null;
  };
  const finish = (stopAudio = false) => {
    if (finished) return;
    finished = true;
    clearTimers();
    detach();
    if (activeRuns.get(audioEl)?.finish === finish) {
      activeRuns.delete(audioEl);
      activeAudioElements.delete(audioEl);
    }
    if (stopAudio) {
      audioEl.pause();
      audioEl.removeAttribute("src");
      audioEl.load();
    }
    onDone();
  };
  const cancel = () => {
    if (finished) return;
    finished = true;
    clearTimers();
    detach();
    activeAudioElements.delete(audioEl);
  };
  const armPlaybackWatchdog = () => {
    clearTimeout(playbackTimer);
    const duration = audioEl.duration;
    const remaining = Number.isFinite(duration) && duration > 0
      ? Math.max(5000, Math.min(130000, (duration - audioEl.currentTime) * 1000 + 4000))
      : unknownDurationTimeout;
    playbackTimer = setTimeout(() => finish(true), remaining);
  };
  const retryResume = () => {
    clearTimeout(resumeTimer);
    if (finished || audioEl.ended || !audioEl.paused) return;
    audioEl.play().catch(() => {});
    resumeTimer = setTimeout(retryResume, 750);
  };

  activeRuns.set(audioEl, { cancel, finish, resume: retryResume });
  activeAudioElements.add(audioEl);
  audioEl.pause();
  audioEl.currentTime = 0;
  audioEl.src = src;
  audioEl.onended = () => finish();
  audioEl.onerror = () => {
    clearTimeout(errorTimer);
    errorTimer = setTimeout(() => finish(true), errorDelay);
  };
  audioEl.onloadedmetadata = armPlaybackWatchdog;
  audioEl.onplaying = () => {
    clearTimeout(loadTimer);
    armPlaybackWatchdog();
  };
  audioEl.ontimeupdate = () => {
    armPlaybackWatchdog();
    onTimeUpdate?.(audioEl);
  };
  audioEl.onpause = () => {
    if (finished || audioEl.ended) return;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(retryResume, 300);
  };
  loadTimer = setTimeout(() => finish(true), loadTimeout);
  audioEl.play().catch(() => {
    clearTimeout(errorTimer);
    errorTimer = setTimeout(() => finish(true), errorDelay);
  });
  return cancel;
}
