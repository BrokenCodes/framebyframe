import { createStudio } from './studio.js'
import { initTheme } from './theme.js'
import { initConsent } from './consent.js'
import { initTranslate } from './translate.js'

/** Bootstrap: wires page chrome and hands the extractor over to studio.js. */

const $ = (sel) => document.querySelector(sel)

/* ---------------------------------------------------------------- chrome -- */

initTheme({
  button: $('#theme-btn'),
  panel: $('#theme-panel'),
  icon: $('#theme-icon'),
})

initTranslate($('#translate-mount'))

const consent = initConsent({
  banner: $('#consent'),
  scrim: $('#consent-scrim'),
  heading: $('#consent-heading'),
  tail: $('#consent-tail'),
  rejectLabel: $('#consent-reject-label'),
  detail: $('#consent-detail'),
  detailsToggle: $('#consent-details-toggle'),
  accept: $('#consent-accept'),
  reject: $('#consent-reject'),
  close: $('#consent-close'),
  state: $('#consent-state'),
})

$('#footer-privacy').addEventListener('click', consent.reopen)
$('#year').textContent = String(new Date().getFullYear())

/* ---- header: transparent over the hero until scrolled ---- */
const header = $('#site-header')
const onScroll = () => header.classList.toggle('is-stuck', window.scrollY >= 80)
window.addEventListener('scroll', onScroll, { passive: true })
onScroll()

/* ---- nav overlay ---- */
const overlay = $('#nav-overlay')
const openNav = () => {
  overlay.hidden = false
  document.body.style.overflow = 'hidden'
  $('#nav-open').setAttribute('aria-expanded', 'true')
}
const closeNav = () => {
  overlay.hidden = true
  document.body.style.overflow = ''
  $('#nav-open').setAttribute('aria-expanded', 'false')
}
$('#nav-open').addEventListener('click', openNav)
$('#nav-close').addEventListener('click', closeNav)
overlay.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeNav))

/* ---- shortcuts dialog ---- */
const shortcuts = $('#shortcuts-overlay')
const openShortcuts = () => {
  shortcuts.hidden = false
  shortcuts.querySelector('.dialog').focus()
}
const closeShortcuts = () => (shortcuts.hidden = true)
$('#shortcuts-open').addEventListener('click', openShortcuts)
$('#shortcuts-close').addEventListener('click', closeShortcuts)
$('#footer-shortcuts').addEventListener('click', openShortcuts)
shortcuts.addEventListener('click', (e) => {
  if (e.target === shortcuts) closeShortcuts()
})

/* ---- FAQ accordion ---- */
$('#faq-list')
  .querySelectorAll('.faq-q')
  .forEach((btn) => {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true'
      btn.setAttribute('aria-expanded', String(!open))
      document.getElementById(btn.getAttribute('aria-controls')).hidden = open
    })
  })

/* ----------------------------------------------------------------- studio -- */

const toolMount = $('#tool-mount')
// Snapshot the server-rendered dropzone so the studio can restore it on reset.
const dropzoneMarkup = toolMount.innerHTML

const extractorSection = $('#extractor')
const heroSection = $('#top')

const studio = createStudio({
  mount: toolMount,
  dropzoneMarkup,
  onPhaseChange: (phase) => {
    // In the studio the tool takes the whole band; the hero copy steps aside.
    const inStudio = phase === 'ready'
    heroSection.classList.toggle('band-alt', inStudio)
    document.querySelectorAll('[data-hero-only]').forEach((el) => {
      el.hidden = inStudio
    })
    layout(inStudio)
  },
})

/**
 * Reflows the extractor between the hero column (idle) and a full-width
 * workbench with its own header and settings sidebar (ready).
 */
function layout(inStudio) {
  let header = document.querySelector('#studio-header')
  let cols = document.querySelector('#studio-cols')

  if (!inStudio) {
    header?.remove()
    if (cols) {
      // Put the tool back in the hero column.
      extractorSection.appendChild(toolMount)
      cols.remove()
    }
    extractorSection.style.gridColumn = ''
    return
  }

  if (!cols) {
    header = document.createElement('div')
    header.id = 'studio-header'
    header.style.marginBottom = '1.5rem'

    cols = document.createElement('div')
    cols.className = 'studio-cols'
    cols.id = 'studio-cols'
    cols.innerHTML = '<div class="studio-main" id="studio-main"></div><aside class="studio-side" id="settings-panel"></aside>'

    extractorSection.appendChild(header)
    extractorSection.appendChild(cols)
    cols.querySelector('#studio-main').appendChild(toolMount)
    // Span both hero columns so the workbench gets the full width.
    extractorSection.style.gridColumn = '1 / -1'
  }

  studio.renderHeader(header)
  studio.renderSettings(document.querySelector('#settings-panel'))
}

/* ---- file input ---- */
const input = $('#file-input')
input.addEventListener('change', () => {
  if (input.files?.length) studio.openFile(input.files[0])
  input.value = ''
})
$('#dropzone').addEventListener('click', () => input.click())

/* ---- drop anywhere on the page, and clipboard paste ---- */
const looksLikeVideo = (file) =>
  file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi|ogv|3gp|mpg|mpeg)$/i.test(file.name)

let dragDepth = 0
const setDragging = (on) => document.querySelector('#dropzone')?.classList.toggle('is-dragging', on)

window.addEventListener('dragenter', (e) => {
  if (!e.dataTransfer?.types.includes('Files')) return
  dragDepth++
  setDragging(true)
})
window.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1)
  if (!dragDepth) setDragging(false)
})
window.addEventListener('dragover', (e) => e.preventDefault())
window.addEventListener('drop', (e) => {
  e.preventDefault()
  dragDepth = 0
  setDragging(false)
  const file = Array.from(e.dataTransfer?.files ?? []).find(looksLikeVideo)
  if (file) studio.openFile(file)
})
window.addEventListener('paste', (e) => {
  const file = Array.from(e.clipboardData?.files ?? []).find(looksLikeVideo)
  if (file) studio.openFile(file)
})

/* ---- keyboard shortcuts ---- */
window.addEventListener('keydown', (e) => {
  const target = e.target
  if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return

  if (e.key === '?') {
    e.preventDefault()
    shortcuts.hidden ? openShortcuts() : closeShortcuts()
    return
  }
  if (e.key === 'Escape') {
    if (!shortcuts.hidden) closeShortcuts()
    if (!overlay.hidden) closeNav()
    return
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a' && studio.state.frames.length) {
    e.preventDefault()
    studio.selectAll()
    return
  }
  if (studio.state.phase !== 'ready') return

  const o = studio.state.options
  switch (e.key) {
    case ' ':
    case 'k':
      e.preventDefault()
      studio.togglePlay()
      break
    case ',':
      e.preventDefault()
      studio.stepFrame(-1)
      break
    case '.':
      e.preventDefault()
      studio.stepFrame(1)
      break
    case 'ArrowLeft':
      e.preventDefault()
      studio.seek(studio.state.current - 1)
      break
    case 'ArrowRight':
      e.preventDefault()
      studio.seek(studio.state.current + 1)
      break
    case 'c':
    case 'C':
      e.preventDefault()
      studio.captureCurrent()
      break
    case 'i':
    case 'I':
      e.preventDefault()
      studio.setRange(Math.min(studio.state.current, o.end - 0.05), o.end)
      break
    case 'o':
    case 'O':
      e.preventDefault()
      studio.setRange(o.start, Math.max(studio.state.current, o.start + 0.05))
      break
    case 'Enter':
      e.preventDefault()
      studio.state.progress ? studio.cancelExtract() : studio.runExtract()
      break
  }
})

/* ---- free blob URLs on unload so long sessions don't accumulate them ---- */
window.addEventListener('pagehide', () => {
  studio.state.frames.forEach((f) => URL.revokeObjectURL(f.url))
  if (studio.state.src) URL.revokeObjectURL(studio.state.src)
})
