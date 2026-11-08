'use client'

import { type RefObject, useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]'

/** Elements Tab can reach inside `root`: enabled, not tabindex="-1", not hidden. */
function tabbable(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.hasAttribute('disabled') &&
      !(element instanceof HTMLInputElement && element.type === 'hidden') &&
      element.getClientRects().length > 0,
  )
}

/**
 * Keyboard behaviour for a modal dialog. While `open` is true:
 * - focus moves into the dialog: to the element marked `data-autofocus`, else the first
 *   focusable element, else the dialog itself (give it tabIndex={-1});
 * - Tab and Shift+Tab stay inside the dialog;
 * - Escape calls `onClose`.
 * When the dialog closes, focus returns to the element that had it before.
 *
 * Attach the returned ref to the dialog's panel (the element that holds its controls).
 */
export function useModalDialog<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
): RefObject<T | null> {
  const ref = useRef<T>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog) return

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const initial = dialog.querySelector<HTMLElement>('[data-autofocus]') ?? tabbable(dialog)[0]
    ;(initial ?? dialog).focus()

    function onKeyDown(event: KeyboardEvent) {
      if (!dialog) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const items = tabbable(dialog)
      if (items.length === 0) {
        event.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previous?.isConnected) previous.focus()
    }
  }, [open])

  return ref
}
