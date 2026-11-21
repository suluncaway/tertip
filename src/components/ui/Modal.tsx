import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: ModalSize;
  closeOnBackdrop?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'w-[min(420px,calc(100vw-2rem))]',
  md: 'w-[min(560px,calc(100vw-2rem))]',
  lg: 'w-[min(760px,calc(100vw-2rem))]',
  xl: 'w-[min(960px,calc(100vw-2rem))]',
};

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  closeOnBackdrop = true,
  footer,
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onCloseRef.current();
    };

    dialog.addEventListener('close', handleClose);

    // Fallback for browsers without native <dialog closedby="any"> (e.g., Safari)
    const supportsClosedBy =
      typeof HTMLDialogElement !== 'undefined' &&
      'closedBy' in HTMLDialogElement.prototype;

    let pressedOutside = false;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    const handlePointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    if (closeOnBackdrop && !supportsClosedBy) {
      dialog.addEventListener('pointerdown', handlePointerDown);
      dialog.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      if (closeOnBackdrop && !supportsClosedBy) {
        dialog.removeEventListener('pointerdown', handlePointerDown);
        dialog.removeEventListener('pointerup', handlePointerUp);
      }
    };
  }, [closeOnBackdrop]);

  const closedByProps = {
    closedby: closeOnBackdrop ? 'any' : 'closerequest',
  } as Record<string, string>;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      className={`tertip-modal ${sizeClasses[size]}`}
      {...closedByProps}
    >
      <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[var(--tertip-border)] bg-[var(--tertip-surface-elevated)]/70 shrink-0">
        <div className="min-w-0">
          <h2
            id={titleId}
            className="font-[var(--tertip-font-display)] text-lg font-semibold text-[var(--tertip-ink)] leading-snug"
          >
            {title}
          </h2>
          {subtitle && (
            <p
              id={subtitleId}
              className="mt-1 text-xs sm:text-sm text-[var(--tertip-ink-muted)]"
            >
              {subtitle}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Kapat"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--tertip-radius-xs)] text-[var(--tertip-ink-muted)] hover:bg-[var(--tertip-surface-subtle)] hover:text-[var(--tertip-ink)] transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>

      {footer && (
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-[var(--tertip-border)] bg-[var(--tertip-surface-elevated)]/70 shrink-0">
          {footer}
        </div>
      )}
    </dialog>
  );
};
