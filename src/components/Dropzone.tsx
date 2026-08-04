import { useCallback, useEffect, useRef, useState } from 'react'
import { FileVideo, Loader2, Plus, UploadCloud } from 'lucide-react'
import { useI18n } from '../i18n'

interface Props {
  onFile: (file: File) => void
  busy: boolean
}

const looksLikeVideo = (file: File) =>
  file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi|ogv|3gp|mpg|mpeg)$/i.test(file.name)

export function Dropzone({ onFile, busy }: Props) {
  const { t } = useI18n()
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const depth = useRef(0)

  const take = useCallback(
    (files: FileList | null | undefined) => {
      if (!files?.length) return
      const file = Array.from(files).find(looksLikeVideo) ?? files[0]
      onFile(file)
    },
    [onFile],
  )

  // Accept a drop anywhere on the page, not just on the card.
  useEffect(() => {
    const onEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return
      depth.current++
      setDragging(true)
    }
    const onLeave = () => {
      depth.current = Math.max(0, depth.current - 1)
      if (depth.current === 0) setDragging(false)
    }
    const onOver = (e: DragEvent) => e.preventDefault()
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      depth.current = 0
      setDragging(false)
      take(e.dataTransfer?.files)
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('dragover', onOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [take])

  // Paste a video file straight from the clipboard.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find(looksLikeVideo)
      if (file) take([file] as unknown as FileList)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [take])

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={t('dropTitle')}
        className="group relative block w-full cursor-pointer overflow-hidden text-start transition-colors"
        style={{
          border: `1px solid ${dragging ? 'var(--accent)' : 'var(--line-strong)'}`,
          background: dragging
            ? 'color-mix(in oklab, var(--accent) 10%, var(--paper-2))'
            : 'var(--paper-2)',
        }}
      >
        {/* corner ticks */}
        {[
          'top-0 start-0 border-t border-s',
          'top-0 end-0 border-t border-e',
          'bottom-0 start-0 border-b border-s',
          'bottom-0 end-0 border-b border-e',
        ].map((pos) => (
          <span
            key={pos}
            aria-hidden="true"
            className={`pointer-events-none absolute h-4 w-4 ${pos}`}
            style={{ borderColor: 'var(--accent)' }}
          />
        ))}

        <div className="flex flex-col items-center gap-6 px-6 py-14 lg:py-20">
          <span
            className="flex h-16 w-16 items-center justify-center border transition-colors"
            style={{
              borderColor: dragging ? 'var(--accent)' : 'var(--line-strong)',
              color: dragging ? 'var(--accent)' : 'var(--ink-2)',
            }}
          >
            {busy ? (
              <Loader2 size={26} className="animate-spin" />
            ) : dragging ? (
              <FileVideo size={26} />
            ) : (
              <UploadCloud size={26} />
            )}
          </span>

          <div className="text-center">
            <p className="display-3" style={{ fontSize: 'clamp(1.25rem,2.4vw,1.625rem)' }}>
              {busy ? t('loading') : t('dropTitle')}
            </p>
            {!busy && (
              <p
                className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: 'var(--accent-text)' }}
              >
                <Plus size={12} />
                {t('dropBrowse')}
              </p>
            )}
          </div>

          <div className="rule" style={{ maxWidth: '10rem' }} />

          <p
            className="max-w-sm text-center text-[11px] uppercase tracking-[0.14em]"
            style={{ color: 'var(--ink-3)' }}
          >
            {t('dropHint')}
          </p>
        </div>
      </button>

      <div className="mt-4 grid grid-cols-2 gap-px" style={{ background: 'var(--line)' }}>
        {[t('privacyBadge'), t('fullRes')].map((line) => (
          <p
            key={line}
            className="px-4 py-3 text-[10px] font-semibold uppercase leading-relaxed tracking-[0.14em]"
            style={{ background: 'var(--paper)', color: 'var(--ink-3)' }}
          >
            {line}
          </p>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="video/*,.mkv,.avi,.mov"
        className="hidden"
        onChange={(e) => {
          take(e.target.files)
          e.target.value = ''
        }}
      />
    </div>
  )
}
