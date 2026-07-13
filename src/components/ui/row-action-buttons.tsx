'use client';

import {
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@/assets/icons';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type RowActionButtonProps = Omit<ButtonProps, 'variant' | 'size' | 'children'> & {
  label?: string;
};

const iconClassName = 'h-3.5 w-3.5 shrink-0';

export function EditRowButton({
  className,
  label = 'Editar',
  type = 'button',
  ...props
}: RowActionButtonProps) {
  return (
    <Button
      type={type}
      size="sm"
      variant="outline"
      className={cn('gap-1.5', className)}
      {...props}
    >
      <PencilSquareIcon className={iconClassName} />
      {label}
    </Button>
  );
}

export function DeleteRowButton({
  className,
  label = 'Eliminar',
  type = 'button',
  size = 'sm',
  ...props
}: Omit<ButtonProps, 'variant' | 'children'> & { label?: string }) {
  return (
    <Button
      type={type}
      size={size}
      variant="danger"
      className={cn('gap-1.5', className)}
      {...props}
    >
      <TrashIcon className={iconClassName} />
      {label}
    </Button>
  );
}

export function ViewRowButton({
  className,
  label = 'Ver',
  type = 'button',
  ...props
}: RowActionButtonProps) {
  return (
    <Button
      type={type}
      size="sm"
      variant="outline"
      className={cn('gap-1.5', className)}
      {...props}
    >
      <EyeIcon className={iconClassName} />
      {label}
    </Button>
  );
}
