const activeRuns = new WeakMap();

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
    if (activeRuns.get(audioEl)?.finish === finish) activeRuns.delete(audioEl);
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
  };
  const armPlaybackWatchdog = () => {
    clearTimeout(playbackTimer);
    const duration = audioEl.duration;
    const remaining = Number.isFinite(duration) && duration > 0
      ? Math.max(5000, Math.min(130000, (duration - audioEl.currentTime) * 1000 + 4000))
      : unknownDurationTimeout;
    playbackTimer = setTimeout(() => finish(true), remaining);
  };

  activeRuns.set(audioEl, { cancel, finish });
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
    if (finished || audioEl.ended || audioEl.currentTime <= 0) return;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => audioEl.play().catch(() => {}), 300);
  };
  loadTimer = setTimeout(() => finish(true), loadTimeout);
  audioEl.play().catch(() => {
    clearTimeout(errorTimer);
    errorTimer = setTimeout(() => finish(true), errorDelay);
  });
  return cancel;
}
