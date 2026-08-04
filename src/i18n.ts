import { createContext, useContext } from 'react'

/*
 * UI strings. Single source language: English.
 *
 * Translation for global readers is handled entirely by Google page translation
 * (see components/GoogleTranslate.tsx), which covers this chrome and the
 * long-form body copy alike. There is deliberately no second, in-app locale
 * system — two competing mechanisms produced mixed-language pages.
 */
const strings = {
  appName: 'FrameByFrame',
  tagline: 'Extract frames from video — right in your browser',
  dropTitle: 'Drop a video here',
  dropOr: 'or',
  dropBrowse: 'browse your files',
  dropHint: 'MP4, WebM, MOV, MKV, AVI — anything your browser can play',
  privacy: 'Your video never leaves this device. Decoding and extraction happen locally in your browser.',
  privacyBadge: 'Private by design',
  fullRes: 'Frames are saved at the video’s native resolution',
  loading: 'Reading video…',
  errorTitle: 'Couldn’t open that video',
  errorDecode:
    'Your browser can’t decode this file. Try MP4 (H.264) or WebM, or convert the file first.',
  errorNoTrack: 'This file has no video track.',
  errorGeneric: 'Something went wrong while reading the file.',
  tryAnother: 'Try another file',

  // player
  play: 'Play',
  pause: 'Pause',
  prevFrame: 'Previous frame',
  nextFrame: 'Next frame',
  jumpBack: 'Back 1 second',
  jumpForward: 'Forward 1 second',
  captureFrame: 'Capture this frame',
  captured: 'Captured',
  setIn: 'Set range start',
  setOut: 'Set range end',
  resetRange: 'Reset range',
  rangeLabel: 'Range',
  muted: 'Mute',
  unmuted: 'Unmute',

  // settings
  settings: 'Extraction settings',
  sampling: 'Sampling',
  modeInterval: 'Every N seconds',
  modeFps: 'Frames per second',
  modeCount: 'Fixed number',
  modeEvery: 'Every frame',
  modeIntervalHelp: 'One frame every {n}s across the range',
  modeFpsHelp: 'Sample at {n} frames per second',
  modeCountHelp: 'Spread {n} frames evenly across the range',
  modeEveryHelp: 'Capture all {n} source frames — slowest, largest',
  interval: 'Interval (seconds)',
  frameRate: 'Sample rate (fps)',
  frameCount: 'Number of frames',
  output: 'Output',
  format: 'Format',
  quality: 'Quality',
  resolution: 'Resolution',
  resNative: 'Native ({w}×{h})',
  resCustom: 'Longest edge',
  naming: 'File names',
  nameIndex: 'Frame number',
  nameTimecode: 'Timecode',
  nameBoth: 'Number + timecode',

  // estimate
  estimate: 'Estimate',
  estFrames: '{n} frames',
  estSize: '≈{size} total',
  estNote: 'Size is estimated from the first frames you extract.',

  // actions
  extract: 'Extract frames',
  extracting: 'Extracting…',
  cancel: 'Cancel',
  cancelled: 'Cancelled',
  progress: '{done} of {total}',
  etaLabel: '~{time} left',
  newVideo: 'New video',

  // results
  results: 'Frames',
  noFrames: 'No frames yet. Set your sampling options and hit extract.',
  selectAll: 'Select all',
  selectNone: 'Clear selection',
  invertSelection: 'Invert',
  selectedCount: '{n} selected',
  downloadZip: 'Download ZIP',
  downloadSelected: 'Download selected ({n})',
  contactSheet: 'Contact sheet',
  clearFrames: 'Clear frames',
  download: 'Download',
  copy: 'Copy',
  copied: 'Copied',
  copyFailed: 'Copy isn’t supported here',
  seekHere: 'Jump to this time',
  remove: 'Remove',
  zipping: 'Building ZIP…',
  gridSize: 'Thumbnail size',
  sortBy: 'Sort',
  sortTime: 'Time',
  sortSizeDesc: 'Largest first',

  // shortcuts
  shortcuts: 'Keyboard shortcuts',
  scPlay: 'Play / pause',
  scStep: 'Step one frame',
  scSecond: 'Jump one second',
  scCapture: 'Capture current frame',
  scIn: 'Set range start / end',
  scExtract: 'Start extraction',
  scSelectAll: 'Select all frames',
  scHelp: 'Show this help',
  scClose: 'Close',

  // meta
  duration: 'Duration',
  dimensions: 'Size',
  fps: 'Frame rate',
  fpsApprox: 'estimated',
  fileSize: 'File',
  theme: 'Theme',
  themeLight: 'Light',
  themeDark: 'Dark',
  themeSystem: 'System',
  translatePage: 'Translate page',
  language: 'Language',
  footer: 'Your video is processed in your browser and never uploaded. No accounts. This site uses Google Analytics.',
}

export type Dict = typeof strings
export type TKey = keyof Dict

export type Translate = (key: TKey, vars?: Record<string, string | number>) => string

/** Interpolates {name} placeholders; unknown names are left visible for debugging. */
export const t: Translate = (key, vars) => {
  const template = (strings[key] ?? key) as string
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_m, name: string) =>
    name in vars ? String(vars[name]) : `{${name}}`,
  )
}

export const I18nContext = createContext<{ t: Translate }>({ t })

export const useI18n = () => useContext(I18nContext)
