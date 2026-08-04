/** Video-element helpers: metadata probing, precise seeking, fps measurement. */

export const hasFrameCallback = () =>
  typeof HTMLVideoElement !== 'undefined' &&
  'requestVideoFrameCallback' in HTMLVideoElement.prototype

/** @param {HTMLVideoElement} video */
export function loadMetadata(video) {
  if (video.readyState >= 1) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', ok)
      video.removeEventListener('error', fail)
    }
    const ok = () => {
      cleanup()
      resolve()
    }
    const fail = () => {
      cleanup()
      reject(new Error('decode-failed'))
    }
    video.addEventListener('loadedmetadata', ok)
    video.addEventListener('error', fail)
  })
}

/**
 * Seeks and resolves once the frame for that time is actually painted.
 * `seeked` alone can fire before the new frame is available to draw, so we wait
 * one frame callback where supported.
 * @param {HTMLVideoElement} video
 * @param {number} time
 */
export function seekTo(video, time) {
  const target = Math.min(Math.max(time, 0), Math.max(video.duration - 1e-4, 0))
  return new Promise((resolve, reject) => {
    let settled = false
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', fail)
    }
    const done = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    }
    const fail = () => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error('seek-failed'))
    }
    const onSeeked = () => {
      if (hasFrameCallback()) {
        video.requestVideoFrameCallback(() => done())
        // Some browsers won't fire rVFC while paused off-screen; don't hang.
        setTimeout(done, 200)
      } else {
        done()
      }
    }

    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', fail)

    if (Math.abs(video.currentTime - target) < 1e-6 && video.readyState >= 2) {
      onSeeked()
      return
    }
    video.currentTime = target
  })
}

/**
 * Estimates frame rate from real presentation timestamps, then snaps to the
 * nearest standard rate. Falls back to 30 where the API is unavailable.
 * @param {HTMLVideoElement} video
 * @returns {Promise<{fps: number, measured: boolean}>}
 */
export async function estimateFps(video) {
  if (!hasFrameCallback() || !Number.isFinite(video.duration) || video.duration <= 0) {
    return { fps: 30, measured: false }
  }

  const wasMuted = video.muted
  const startTime = video.currentTime
  video.muted = true

  const stamps = []
  const collected = await new Promise((resolve) => {
    let stop = false
    const finish = (ok) => {
      if (stop) return
      stop = true
      resolve(ok)
    }
    const tick = (_now, meta) => {
      if (stop) return
      stamps.push(meta.mediaTime)
      if (stamps.length >= 14) return finish(true)
      video.requestVideoFrameCallback(tick)
    }
    video.requestVideoFrameCallback(tick)
    video.play().catch(() => finish(false))
    // Hard stop so a stalled decode can't block loading the file.
    setTimeout(() => finish(stamps.length >= 4), 1600)
  })

  video.pause()
  video.muted = wasMuted
  try {
    await seekTo(video, startTime)
  } catch {
    /* playback position is cosmetic here */
  }

  if (!collected || stamps.length < 4) return { fps: 30, measured: false }

  // Median delta resists dropped/duplicated frames better than the mean.
  const deltas = stamps
    .slice(1)
    .map((t, i) => t - stamps[i])
    .filter((d) => d > 1e-4)
    .sort((a, b) => a - b)
  if (!deltas.length) return { fps: 30, measured: false }

  const raw = 1 / deltas[Math.floor(deltas.length / 2)]
  const common = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 90, 120, 144, 240]
  const near = common.find((c) => Math.abs(c - raw) / c < 0.03)
  return { fps: near ?? Math.round(raw * 1000) / 1000, measured: true }
}

/**
 * @param {HTMLVideoElement} video
 * @returns {Promise<{duration:number,width:number,height:number,fps:number,fpsMeasured:boolean}>}
 */
export async function probe(video) {
  await loadMetadata(video)
  if (!video.videoWidth || !video.videoHeight) throw new Error('no-video-track')
  const { fps, measured } = await estimateFps(video)
  return {
    duration: video.duration,
    width: video.videoWidth,
    height: video.videoHeight,
    fps,
    fpsMeasured: measured,
  }
}
