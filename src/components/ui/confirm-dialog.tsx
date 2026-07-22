'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

export type ConfirmDialogVariant = 'danger' | 'warning' | 'default';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  isLoading?: boolean;
  disabled?: boolean;
  /** Contenido extra (motivo, checklist) entre descripción y acciones. */
  children?: ReactNode;
}

const confirmVariant: Record<
  ConfirmDialogVariant,
  'danger' | 'primary' | 'outline'
> = {
  danger: 'danger',
  warning: 'primary',
  default: 'primary',
};

/**
 * Confirmación destructiva/estándar reutilizable (I042).
 * Envuelve Modal con CTA peligroso, loading y foco accesible.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  disabled = false,
  children,
}: ConfirmDialogProps) {
  const loadingLabel =
    isLoading && confirmLabel.endsWith('...')
      ? confirmLabel
      : isLoading
        ? 'Procesando…'
        : confirmLabel;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnClickOutside={!isLoading}
      footer={
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant[variant]}
            onClick={onConfirm}
            disabled={isLoading || disabled}
            aria-busy={isLoading}
          >
            {loadingLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="text-sm text-dark dark:text-white">{description}</div>
        {children}
      </div>
    </Modal>
  );
}
