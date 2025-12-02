/**
 * Competitor Ranking Table
 * 경쟁사 순위 테이블 (정렬 가능)
 */

'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUpDown, Trophy, Medal, Award } from 'lucide-react'
import { generateCompetitorRankingData } from '@/lib/visualizations/data-processor'
import type { Competitor } from '@/types/competitors'

interface CompetitorRankingTableProps {
  competitors: Competitor[]
  myDomain?: string
}

type SortKey = 'rank' | 'domain' | 'citations' | 'rate'
type SortOrder = 'asc' | 'desc'

export function CompetitorRankingTable({
  competitors,
  myDomain,
}: CompetitorRankingTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const rankingData = generateCompetitorRankingData(competitors, myDomain)

  // 정렬
  const sortedData = [...rankingData].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortKey) {
      case 'rank':
        aValue = a.rank
        bValue = b.rank
        break
      case 'domain':
        aValue = a.domain
        bValue = b.domain
        break
      case 'citations':
        aValue = a.citationCount
        bValue = b.citationCount
        break
      case 'rate':
        aValue = a.citationRate
        bValue = b.citationRate
        break
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />
    return <span className="text-gray-500">#{rank}</span>
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">경쟁사 순위</h3>
          <p className="text-sm text-gray-600">
            인용 횟수 기준 경쟁사 순위를 확인하세요
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('rank')}
                    className="flex items-center gap-1 font-medium text-sm hover:text-blue-600"
                  >
                    순위
                    <ArrowUpDown size={14} />
                  </button>
                </th>
                <th className="text-left py-3 px-4">
                  <button
                    onClick={() => handleSort('domain')}
                    className="flex items-center gap-1 font-medium text-sm hover:text-blue-600"
                  >
                    도메인
                    <ArrowUpDown size={14} />
                  </button>
                </th>
                <th className="text-right py-3 px-4">
                  <button
                    onClick={() => handleSort('citations')}
                    className="flex items-center gap-1 font-medium text-sm hover:text-blue-600 ml-auto"
                  >
                    인용 횟수
                    <ArrowUpDown size={14} />
                  </button>
                </th>
                <th className="text-right py-3 px-4">
                  <button
                    onClick={() => handleSort('rate')}
                    className="flex items-center gap-1 font-medium text-sm hover:text-blue-600 ml-auto"
                  >
                    인용률
                    <ArrowUpDown size={14} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item) => (
                <tr
                  key={item.domain}
                  className={`border-b hover:bg-gray-50 ${
                    item.isMyDomain ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(item.rank)}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.domain}</span>
                      {item.brandName && (
                        <span className="text-sm text-gray-500">
                          ({item.brandName})
                        </span>
                      )}
                      {item.isMyDomain && (
                        <Badge variant="default" className="bg-blue-500">
                          내 도메인
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {item.citationCount}회
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    {item.citationRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {sortedData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              경쟁사 데이터가 없습니다
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
