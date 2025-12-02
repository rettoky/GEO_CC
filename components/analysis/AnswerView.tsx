import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AnswerViewProps {
  answer: string
  model: string
}

/**
 * 답변 전문 표시 컴포넌트 (T048)
 */
export function AnswerView({ answer, model }: AnswerViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">답변 전문 ({model})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap text-gray-700">{answer}</p>
        </div>
      </CardContent>
    </Card>
  )
}
