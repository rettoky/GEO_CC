'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { LLMType } from '@/types'

interface LLMTabsProps {
  llms: LLMType[]
  onTabChange: (llm: LLMType) => void
}

/**
 * LLM 탭 네비게이션 컴포넌트 (T045)
 */
export function LLMTabs({ llms, onTabChange }: LLMTabsProps) {
  const [activeTab, setActiveTab] = useState<LLMType>(llms[0])

  const handleTabClick = (llm: LLMType) => {
    setActiveTab(llm)
    onTabChange(llm)
  }

  const llmLabels: Record<LLMType, string> = {
    perplexity: 'Perplexity',
    chatgpt: 'ChatGPT',
    gemini: 'Gemini',
    claude: 'Claude',
  }

  return (
    <div className="flex gap-2 border-b">
      {llms.map((llm) => (
        <Button
          key={llm}
          variant={activeTab === llm ? 'default' : 'ghost'}
          onClick={() => handleTabClick(llm)}
          className="rounded-b-none"
        >
          {llmLabels[llm]}
        </Button>
      ))}
    </div>
  )
}
