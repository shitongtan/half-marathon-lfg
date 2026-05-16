export function Badge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    "Easy Run": "bg-green-500/20 text-green-400 border border-green-500/30",
    "Long Run": "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    "Tempo": "bg-orange-500/20 text-orange-400 border border-orange-500/30",
    "Intervals": "bg-red-500/20 text-red-400 border border-red-500/30",
    "Recovery": "bg-purple-500/20 text-purple-400 border border-purple-500/30",
    "Rest": "bg-gray-500/20 text-gray-400 border border-gray-500/30",
    "Cross-Train": "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[type] ?? styles["Rest"]}`}>
      {type}
    </span>
  )
}
