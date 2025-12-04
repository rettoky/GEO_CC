/**
 * Manual Competitor Input
 * 수동 경쟁사 입력 폼
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { createCompetitor, deleteCompetitor } from '@/lib/supabase/queries/competitors'
import { useToast } from '@/hooks/use-toast'
import type { Competitor } from '@/types/competitors'

interface ManualInputProps {
  analysisId: string
  existingCompetitors: Competitor[]
  onAdd: () => void
}

export function ManualInput({
  analysisId,
  existingCompetitors,
  onAdd,
}: ManualInputProps) {
  const [domain, setDomain] = useState('')
  const [brandName, setBrandName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const supabase = createClient()

  const handleAdd = async () => {
    if (!domain.trim()) {
      toast({
        title: '도메인 입력 필요',
        description: '경쟁사 도메인을 입력하세요',
        variant: 'destructive',
      })
      return
    }

    // 간단한 도메인 형식 검증
    if (!domain.includes('.')) {
      toast({
        title: '잘못된 도메인',
        description: '올바른 도메인 형식을 입력하세요 (예: example.com)',
        variant: 'destructive',
      })
      return
    }

    // 중복 체크
    const isDuplicate = existingCompetitors.some(
      (c) => c.domain.toLowerCase() === domain.toLowerCase()
    )

    if (isDuplicate) {
      toast({
        title: '중복된 경쟁사',
        description: '이미 등록된 경쟁사입니다',
        variant: 'destructive',
      })
      return
    }

    setIsAdding(true)

    try {
      await createCompetitor(supabase, {
        analysis_id: analysisId,
        domain: domain.trim().toLowerCase(),
        brand_name: brandName.trim() || undefined,
        detection_method: 'manual',
        citation_count: 0,
        is_confirmed: true,
      })

      toast({
        title: '경쟁사 추가 완료',
        description: `${domain}을(를) 경쟁사로 추가했습니다`,
      })

      // 폼 초기화
      setDomain('')
      setBrandName('')

      onAdd()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      toast({
        title: '경쟁사 추가 실패',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (competitor: Competitor) => {
    setDeletingIds((prev) => new Set(prev).add(competitor.id))

    try {
      await deleteCompetitor(supabase, competitor.id)

      toast({
        title: '경쟁사 삭제 완료',
        description: `${competitor.domain}을(를) 삭제했습니다`,
      })

      onAdd()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      toast({
        title: '경쟁사 삭제 실패',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(competitor.id)
        return next
      })
    }
  }

  const manualCompetitors = existingCompetitors.filter(
    (c) => c.detection_method === 'manual'
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        직접 경쟁사 도메인을 입력하여 추가할 수 있습니다.
      </p>

      {/* 입력 폼 */}
      <Card className="p-4">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">
              도메인 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              브랜드명 (선택사항)
            </label>
            <Input
              placeholder="예: 삼성화재"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
              }}
            />
          </div>

          <Button onClick={handleAdd} disabled={isAdding} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            경쟁사 추가
          </Button>
        </div>
      </Card>

      {/* 수동 추가된 경쟁사 목록 */}
      {manualCompetitors.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-700">
            수동 추가된 경쟁사 ({manualCompetitors.length})
          </h4>
          {manualCompetitors.map((comp) => (
            <Card key={comp.id} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{comp.domain}</div>
                  {comp.brand_name && (
                    <div className="text-sm text-gray-500">{comp.brand_name}</div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(comp)}
                  disabled={deletingIds.has(comp.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {manualCompetitors.length === 0 && (
        <div className="text-center text-gray-500 py-4 text-sm">
          아직 수동으로 추가된 경쟁사가 없습니다
        </div>
      )}
    </div>
  )
}
