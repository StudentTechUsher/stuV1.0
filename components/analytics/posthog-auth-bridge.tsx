'use client'

import { usePostHogIdentify } from '@/lib/hooks/usePostHogIdentify'

export function PostHogAuthBridge() {
  usePostHogIdentify()
  return null
}
