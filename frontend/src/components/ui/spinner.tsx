import { cn } from "@/lib/utils"

interface SpinnerProps {
  className?: string
  size?: "sm" | "md" | "lg"
  variant?: "border" | "solid"
}

export function Spinner({ className, size = "md", variant = "border" }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  }

  if (variant === "solid") {
    return (
      <div
        className={cn(
          "animate-spin rounded-full bg-green-600",
          sizeClasses[size],
          className
        )}
        style={{
          background: 'conic-gradient(from 0deg, transparent, transparent 270deg, green)',
        }}
      />
    )
  }

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-4 border-green-200 border-t-green-600",
        sizeClasses[size],
        className
      )}
    />
  )
}
