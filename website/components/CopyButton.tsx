'use client'

import { useRef, useState } from 'react'
import { copyText } from '@/lib/motion'

/** A copy button for the command or URL in the element with id `target`. */
export function CopyButton({ target, label = 'Copy' }: { target: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'success' | 'selected'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const onClick = async () => {
    const el = document.getElementById(target)
    if (!el) return
    if (await copyText(el.textContent ?? '')) setState('success')
    else {
      const range = document.createRange()
      range.selectNodeContents(el)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
      setState('selected')
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setState('idle'), 1600)
  }

  return (
    <button className="btn copy" type="button" onClick={onClick} data-state={state === 'success' ? 'success' : undefined}>
      {state === 'success' ? 'Copied' : state === 'selected' ? 'Selected' : label}
    </button>
  )
}
