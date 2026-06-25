'use client'

import { Modal } from './Modal'
import { Button } from './Button'

type ConfirmModalProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmModal({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel, loading }: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading} size="sm">
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={loading} size="sm">
            {loading ? 'Deleting...' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
