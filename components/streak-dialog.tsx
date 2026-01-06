"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Flame, RefreshCw } from "lucide-react"

interface StreakDialogProps {
  open: boolean
  onClose: () => void
  streakDays: number3 
  
  
}

const MOTIVATIONAL_QUOTES = [
  "Every new entry is a fresh start!",
  "Your journey to self-discovery continues.",
  "Today is a perfect time to reset and reflect.",
  "Progress, not perfection, is what matters.",
  "Each day is an opportunity to grow.",
  "You've got this! Keep going!",
  "Consistency is the key to lasting change.",
]

export function StreakDialog({ open, onClose, streakDays }: StreakDialogProps) {
  const [quote, setQuote] = useState("")

  useEffect(() => {
    if (open) {
      const random =
        MOTIVATIONAL_QUOTES[
          Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)
        ]
      setQuote(random)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30">
              <RefreshCw className="text-red-500" size={32} />
            </div>
          </div>

          <DialogTitle className="text-2xl text-center">
            Streak Reset
          </DialogTitle>

          {/* ✅ FIXED: only inline-safe elements inside DialogDescription */}
          <DialogDescription className="text-center mt-4">
            <span className="block text-foreground font-semibold mb-2">
              Your streak has been reset
            </span>
            <span className="block text-muted-foreground">
              You missed a day, but that's okay!
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Streak summary */}
        <div className="rounded-lg p-6 text-center mb-6 border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/30">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Flame className="text-red-500" size={24} />
            <span className="text-4xl font-bold text-red-600 dark:text-red-400">
              0
            </span>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300">
            Your previous streak was {streakDays} days
          </p>
        </div>

        {/* Quote */}
        <div className="rounded-lg p-6 mb-6 border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/30">
          <p className="text-center text-foreground italic">
            “{quote}”
          </p>
        </div>

        {/* Info points */}
        <div className="space-y-3 text-sm text-muted-foreground mb-6">
          <div className="flex gap-2">
            <span className="font-bold">•</span>
            <span>Streaks encourage daily engagement</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold">•</span>
            <span>Missing one day doesn't erase your progress</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold">•</span>
            <span>Start fresh today and build momentum</span>
          </div>
        </div>

        <Button
          onClick={onClose}
          className="w-full"
        >
          Let’s Start Fresh!
        </Button>
      </DialogContent>
    </Dialog>
  )
}
