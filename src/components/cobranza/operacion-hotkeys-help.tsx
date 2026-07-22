'use client';

import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { useHotkeys, type HotkeyBinding } from '@/hooks/use-hotkeys';

export interface HotkeyHelpItem {
  keys: string;
  descripcion: string;
}

interface OperacionHotkeysHelpProps {
  atajos: HotkeyHelpItem[];
  /** Abre ayuda con `?`. Default true. */
  enableHelpShortcut?: boolean;
}

/**
 * Overlay de ayuda de atajos (I041). Abrir con `?`.
 */
export function OperacionHotkeysHelp({
  atajos,
  enableHelpShortcut = true,
}: OperacionHotkeysHelpProps) {
  const [abierto, setAbierto] = useState(false);

  const bindings = useMemo<HotkeyBinding[]>(
    () => [
      {
        key: '?',
        shift: true,
        enabled: enableHelpShortcut,
        handler: () => setAbierto(true),
      },
      {
        key: '/',
        shift: true,
        enabled: enableHelpShortcut,
        // En algunos layouts `?` llega como Shift+/
        handler: () => setAbierto(true),
      },
    ],
    [enableHelpShortcut],
  );

  useHotkeys(bindings);

  return (
    <Modal
      isOpen={abierto}
      onClose={() => setAbierto(false)}
      title="Atajos de teclado"
      size="sm"
    >
      <ul className="space-y-2 text-sm">
        {atajos.map((item) => (
          <li
            key={item.keys}
            className="flex items-center justify-between gap-4 border-b border-stroke py-2 last:border-0 dark:border-dark-3"
          >
            <span className="text-gray-600 dark:text-gray-400">
              {item.descripcion}
            </span>
            <kbd className="rounded border border-stroke bg-gray-2 px-2 py-0.5 font-mono text-xs dark:border-dark-3 dark:bg-dark-2">
              {item.keys}
            </kbd>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
