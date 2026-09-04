"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive text-center">Application Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-center">
                A critical error occurred. Please refresh the page.
              </p>
              {error.digest && (
                <p className="text-muted-foreground text-center text-xs">
                  Error ID: {error.digest}
                </p>
              )}
              <div className="flex justify-center">
                <Button onClick={reset}>Refresh Page</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}
