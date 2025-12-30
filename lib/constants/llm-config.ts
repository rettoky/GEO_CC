/**
 * LLM Configuration
 * LLM 관련 설정 통합
 */
import { LLM_COLORS, LLM_GRADIENTS } from './chart-colors'

export const LLM_CONFIG = {
  perplexity: {
    name: 'Perplexity',
    shortName: 'PPX',
    color: LLM_COLORS.perplexity,
    gradient: LLM_GRADIENTS.perplexity,
    icon: '🔮',
  },
  chatgpt: {
    name: 'ChatGPT',
    shortName: 'GPT',
    color: LLM_COLORS.chatgpt,
    gradient: LLM_GRADIENTS.chatgpt,
    icon: '🤖',
  },
  gemini: {
    name: 'Gemini',
    shortName: 'GEM',
    color: LLM_COLORS.gemini,
    gradient: LLM_GRADIENTS.gemini,
    icon: '💎',
  },
  claude: {
    name: 'Claude',
    shortName: 'CLD',
    color: LLM_COLORS.claude,
    gradient: LLM_GRADIENTS.claude,
    icon: '🧠',
  },
} as const

// 활성화된 LLM 목록
export const ACTIVE_LLM_KEYS = ['perplexity', 'chatgpt', 'gemini'] as const

// 헬퍼 함수
export function getLLMColor(llm: string): string {
  return LLM_CONFIG[llm as keyof typeof LLM_CONFIG]?.color ?? '#6b7280'
}

export function getLLMName(llm: string): string {
  return LLM_CONFIG[llm as keyof typeof LLM_CONFIG]?.name ?? llm
}

export function getLLMGradient(llm: string): { start: string; end: string } {
  return LLM_CONFIG[llm as keyof typeof LLM_CONFIG]?.gradient ?? { start: '#6b7280', end: '#9ca3af' }
}
