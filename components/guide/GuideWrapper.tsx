'use client'

import { useState } from 'react'
import GuideFAB from './GuideFAB'
import GuideModal from './GuideModal'

interface GuideWrapperProps {
  locale: string
}

/**
 * 教學功能包裝元件
 * 整合 FAB 按鈕與 Modal，管理開關狀態
 */
export default function GuideWrapper({ locale }: GuideWrapperProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleOpen = () => setIsOpen(true)
  const handleClose = () => setIsOpen(false)

  return (
    <>
      <GuideFAB onClick={handleOpen} locale={locale} />
      <GuideModal isOpen={isOpen} onClose={handleClose} locale={locale} />
    </>
  )
}
