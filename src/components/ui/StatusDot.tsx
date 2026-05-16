export function StatusDot({ status }: { status: string }) {
  if (status === "completed") return <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
  if (status === "missed") return <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
  return <span className="w-2 h-2 rounded-full border border-gray-500 inline-block" />
}
