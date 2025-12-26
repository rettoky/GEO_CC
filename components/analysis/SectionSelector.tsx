'use client'

import { useState } from 'react'
import { useTrackingSection } from '@/contexts/TrackingSectionContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Folder } from 'lucide-react'

// 섹션 색상 옵션
const SECTION_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

interface SectionSelectorProps {
  selectedSectionId: string | null
  onSectionChange: (sectionId: string | null) => void
  onSectionCreated?: (sectionId: string) => void
  defaultDomain?: string
  defaultBrand?: string
}

export function SectionSelector({
  selectedSectionId,
  onSectionChange,
  onSectionCreated,
  defaultDomain,
  defaultBrand,
}: SectionSelectorProps) {
  const { sections, createSection, loading } = useTrackingSection()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')
  const [newSectionDescription, setNewSectionDescription] = useState('')
  const [newSectionColor, setNewSectionColor] = useState(SECTION_COLORS[0])
  const [isCreating, setIsCreating] = useState(false)

  const selectedSection = sections.find(s => s.id === selectedSectionId)

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) return

    setIsCreating(true)
    try {
      const newSection = await createSection({
        name: newSectionName.trim(),
        description: newSectionDescription.trim() || null,
        default_domain: defaultDomain || null,
        default_brand: defaultBrand || null,
        default_brand_aliases: [],
        color: newSectionColor,
        is_active: true,
      })

      if (newSection) {
        onSectionChange(newSection.id)
        onSectionCreated?.(newSection.id)
        setDialogOpen(false)
        setNewSectionName('')
        setNewSectionDescription('')
        setNewSectionColor(SECTION_COLORS[0])
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Folder className="h-4 w-4" />
        <span>트래킹 섹션:</span>
      </div>

      <Select
        value={selectedSectionId || 'none'}
        onValueChange={(value) => onSectionChange(value === 'none' ? null : value)}
        disabled={loading}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="섹션 선택...">
            {selectedSection ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: selectedSection.color }}
                />
                <span className="truncate">{selectedSection.name}</span>
              </div>
            ) : (
              '섹션 미지정'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">섹션 미지정</span>
          </SelectItem>
          {sections.map((section) => (
            <SelectItem key={section.id} value={section.id}>
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: section.color }}
                />
                <span>{section.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            새 섹션
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>새 트래킹 섹션 만들기</DialogTitle>
            <DialogDescription>
              관련 분석을 그룹화하여 추적할 새 섹션을 만드세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">섹션 이름</Label>
              <Input
                id="name"
                placeholder="예: 코카콜라 브랜드, 1TB HDD 제품군"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">설명 (선택)</Label>
              <Input
                id="description"
                placeholder="이 섹션에 대한 간단한 설명"
                value={newSectionDescription}
                onChange={(e) => setNewSectionDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>색상</Label>
              <div className="flex gap-2">
                {SECTION_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-6 h-6 rounded-full transition-transform ${
                      newSectionColor === color
                        ? 'ring-2 ring-offset-2 ring-primary scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewSectionColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleCreateSection}
              disabled={!newSectionName.trim() || isCreating}
            >
              {isCreating ? '생성 중...' : '섹션 만들기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
