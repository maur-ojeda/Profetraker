'use client'

import dynamic from 'next/dynamic'

const ClarityAnalytics = dynamic(() => import('@/components/ClarityAnalytics'), { ssr: false })
const PWARegister = dynamic(() => import('@/components/PWARegister'), { ssr: false })

export default function ClientOnlyScripts() {
  return (
    <>
      <ClarityAnalytics />
      <PWARegister />
    </>
  )
}
