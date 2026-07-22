'use client';

import { useEffect } from 'react';

export interface HotkeyBinding {
  /** Letra o tecla (ej. 'g', 'n', '?'). Case-insensitive para letras. */
  key: string;
  handler: () => void;
  /** Si true, no dispara cuando el foco está en input/textarea/select/contentEditable. */
  ignoreWhenTyping?: boolean;
  /** Requiere Ctrl/Meta. */
  ctrl?: boolean;
  /** Requiere Shift. */
  shift?: boolean;
  enabled?: boolean;
}

function esCampoEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  return target.isContentEditable;
}

/**
 * Atajos de teclado para flujos operativos (I041).
 */
export function useHotkeys(bindings: HotkeyBinding[]): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      for (const binding of bindings) {
        if (binding.enabled === false) {
          continue;
        }
        if (binding.ignoreWhenTyping !== false && esCampoEditable(event.target)) {
          continue;
        }

        const keyMatch =
          event.key.toLowerCase() === binding.key.toLowerCase();
        if (!keyMatch) {
          continue;
        }

        const ctrlPressed = event.ctrlKey || event.metaKey;
        if (Boolean(binding.ctrl) !== ctrlPressed) {
          continue;
        }
        if (Boolean(binding.shift) !== event.shiftKey) {
          continue;
        }

        event.preventDefault();
        binding.handler();
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [bindings]);
}
