'use client'

import { useEffect } from 'react'

/**
 * Microsoft Clarity analytics.
 * Activates only when NEXT_PUBLIC_CLARITY_ID is set in .env.local
 */
export default function ClarityAnalytics() {
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_CLARITY_ID
    if (!id || typeof window === 'undefined') return

    try {
      const script = document.createElement('script')
      script.type = 'text/javascript'
      script.innerHTML = `
        (function(c,l,a,r,i,t,y){
          c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
          t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
          y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "${id}");
      `
      document.head.appendChild(script)
    } catch (e) {
      console.warn('Clarity analytics failed to load:', e)
    }
  }, [])

  return null
}
