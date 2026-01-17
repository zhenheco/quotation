/**
 * DeleteConfirmModal Accessibility Tests
 *
 * 驗證 Modal 元件的 ARIA 屬性和無障礙支援
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DeleteConfirmModal from '@/components/ui/DeleteConfirmModal'

describe('DeleteConfirmModal Accessibility', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: '確認刪除',
    description: '此操作無法復原，確定要刪除嗎？',
    confirmText: '刪除',
    cancelText: '取消',
  }

  describe('ARIA attributes', () => {
    it('should have role="dialog"', () => {
      render(<DeleteConfirmModal {...defaultProps} />)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
    })

    it('should have aria-modal="true"', () => {
      render(<DeleteConfirmModal {...defaultProps} />)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    it('should have aria-labelledby pointing to title', () => {
      render(<DeleteConfirmModal {...defaultProps} />)
      const dialog = screen.getByRole('dialog')
      const labelId = dialog.getAttribute('aria-labelledby')

      expect(labelId).toBeTruthy()
      const titleElement = document.getElementById(labelId!)
      expect(titleElement).toBeInTheDocument()
      expect(titleElement).toHaveTextContent('確認刪除')
    })

    it('should have aria-describedby pointing to description', () => {
      render(<DeleteConfirmModal {...defaultProps} />)
      const dialog = screen.getByRole('dialog')
      const descId = dialog.getAttribute('aria-describedby')

      expect(descId).toBeTruthy()
      const descElement = document.getElementById(descId!)
      expect(descElement).toBeInTheDocument()
      expect(descElement).toHaveTextContent('此操作無法復原')
    })
  })

  describe('keyboard interaction', () => {
    it('should call onClose when Escape is pressed', async () => {
      const onClose = vi.fn()
      render(<DeleteConfirmModal {...defaultProps} onClose={onClose} />)

      // 模擬 ESC 鍵
      const event = new KeyboardEvent('keydown', { key: 'Escape' })
      document.dispatchEvent(event)

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('content rendering', () => {
    it('should render the title correctly', () => {
      render(<DeleteConfirmModal {...defaultProps} />)
      expect(screen.getByText('確認刪除')).toBeInTheDocument()
    })

    it('should render the description correctly', () => {
      render(<DeleteConfirmModal {...defaultProps} />)
      expect(screen.getByText('此操作無法復原，確定要刪除嗎？')).toBeInTheDocument()
    })

    it('should render confirm and cancel buttons', () => {
      render(<DeleteConfirmModal {...defaultProps} />)
      expect(screen.getByText('刪除')).toBeInTheDocument()
      expect(screen.getByText('取消')).toBeInTheDocument()
    })

    it('should not render when isOpen is false', () => {
      render(<DeleteConfirmModal {...defaultProps} isOpen={false} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
