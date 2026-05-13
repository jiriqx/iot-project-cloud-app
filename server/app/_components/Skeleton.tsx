export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div className={`h-4 bg-gray-100 rounded animate-pulse ${className ?? ''}`} />
  )
}

export function SkeletonCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-5 ${className ?? ''}`}>
      {children}
    </div>
  )
}
