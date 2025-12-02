/**
 * Variation List Component
 * 생성된 쿼리 변형 목록 표시 및 편집
 */

'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { X, Edit2, Check } from 'lucide-react'
import type { GeneratedVariation } from '@/types/queryVariations'

interface VariationListProps {
  variations: GeneratedVariation[]
  onChange: (variations: GeneratedVariation[]) => void
}

const typeLabels: Record<string, string> = {
  demographic: '연령/성별',
  informational: '정보성',
  comparison: '비교',
  recommendation: '추천',
}

const typeColors: Record<string, string> = {
  demographic: 'bg-blue-100 text-blue-800',
  informational: 'bg-green-100 text-green-800',
  comparison: 'bg-yellow-100 text-yellow-800',
  recommendation: 'bg-purple-100 text-purple-800',
}

export function VariationList({ variations, onChange }: VariationListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleDelete = (index: number) => {
    const newVariations = variations.filter((_, i) => i !== index)
    onChange(newVariations)
  }

  const startEdit = (index: number) => {
    setEditingIndex(index)
    setEditValue(variations[index].query)
  }

  const saveEdit = () => {
    if (editingIndex !== null) {
      const newVariations = [...variations]
      newVariations[editingIndex] = {
        ...newVariations[editingIndex],
        query: editValue,
      }
      onChange(newVariations)
      setEditingIndex(null)
    }
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditValue('')
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-semibold text-lg">
            생성된 변형 ({variations.length}개)
          </h4>
          <p className="text-sm text-gray-500">
            변형을 수정하거나 삭제할 수 있습니다
          </p>
        </div>

        <div className="space-y-2">
          {variations.map((variation, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                {editingIndex === index ? (
                  <div className="flex gap-2">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit()
                        if (e.key === 'Escape') cancelEdit()
                      }}
                    />
                    <Button size="sm" onClick={saveEdit} variant="default">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={cancelEdit} variant="outline">
                      취소
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="font-medium">{variation.query}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {variation.reasoning}
                    </div>
                  </>
                )}
              </div>

              <Badge className={typeColors[variation.type]}>
                {typeLabels[variation.type] || variation.type}
              </Badge>

              <div className="flex gap-1">
                {editingIndex !== index && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(index)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {variations.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            아직 생성된 변형이 없습니다
          </div>
        )}
      </div>
    </Card>
  )
}
