/** Video-element helpers: metadata probing, precise seeking, fps estimation. */

export interface VideoMeta {
  duration: number
  width: number
  height: number
  fps: number
  /** True when fps came from real frame callbacks rather than the 30fps fallback. */
  fpsMeasured: boolean
}

export const hasFrameCallback = () =>
  typeof HTMLVideoElement !== 'undefined' &&
  'requestVideoFrameCallback' in HTMLVideoElement.prototype

export function loadMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 1) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const ok = () => {
      cleanup()
      resolve()
    }
    const fail = () => {
      cleanup()
      reject(new Error('decode-failed'))
    }
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', ok)
      video.removeEventListener('error', fail)
    }
    video.addEventListener('loadedmetadata', ok)
    video.addEventListener('error', fail)
  })
}

/**
 * Seeks and resolves once the frame for that time is actually painted.
 * `seeked` alone can fire before the new frame is available for drawing, so we
 * wait one frame callback where supported.
 */
export function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  const target = Math.min(Math.max(time, 0), Math.max(video.duration - 1e-4, 0))
  return new Promise((resolve, reject) => {
    let settled = false
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
        // one painted frame after the seek settles
        video.requestVideoFrameCallback(() => done())
        // some browsers won't fire rVFC while paused off-screen; don't hang
        setTimeout(done, 200)
      } else {
        done()
      }
    }
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', fail)
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
 * Estimates frame rate by watching real presentation timestamps.
 * Falls back to 30 when the browser has no frame callback API.
 */
export async function estimateFps(video: HTMLVideoElement): Promise<{ fps: number; measured: boolean }> {
  if (!hasFrameCallback() || !Number.isFinite(video.duration) || video.duration <= 0) {
    return { fps: 30, measured: false }
  }

  const wasMuted = video.muted
  const startTime = video.currentTime
  video.muted = true

  const stamps: number[] = []
  const collected = await new Promise<boolean>((resolve) => {
    let stop = false
    const finish = (ok: boolean) => {
      if (stop) return
      stop = true
      resolve(ok)
    }
    const tick = (_now: number, meta: VideoFrameCallbackMetadata) => {
      if (stop) return
      stamps.push(meta.mediaTime)
      if (stamps.length >= 14) return finish(true)
      video.requestVideoFrameCallback(tick)
    }
    video.requestVideoFrameCallback(tick)
    video.play().catch(() => finish(false))
    // hard stop so a stalled decode can't block loading the file
    setTimeout(() => finish(stamps.length >= 4), 1600)
  })

  video.pause()
  video.muted = wasMuted
  try {
    await seekTo(video, startTime)
  } catch {
    /* not fatal — playback position is cosmetic here */
  }

  if (!collected || stamps.length < 4) return { fps: 30, measured: false }

  // median delta resists dropped/duplicated frames better than the mean
  const deltas = stamps
    .slice(1)
    .map((t, i) => t - stamps[i])
    .filter((d) => d > 1e-4)
    .sort((a, b) => a - b)
  if (!deltas.length) return { fps: 30, measured: false }

  const median = deltas[Math.floor(deltas.length / 2)]
  const raw = 1 / median
  // snap to the nearest common rate when we're within 3%
  const common = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 90, 120, 144, 240]
  const near = common.find((c) => Math.abs(c - raw) / c < 0.03)
  return { fps: near ?? Math.round(raw * 1000) / 1000, measured: true }
}

export async function probe(video: HTMLVideoElement): Promise<VideoMeta> {
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
