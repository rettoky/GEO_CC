import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorMessageProps {
  title?: string
  message: string
}

/**
 * 에러 메시지 컴포넌트 (T039)
 */
export function ErrorMessage({ title = '오류가 발생했습니다', message }: ErrorMessageProps) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-red-600">{message}</p>
      </CardContent>
    </Card>
  )
}
