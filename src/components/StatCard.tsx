import { LucideIcon } from 'lucide-react'

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  color = 'purple',
}: {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: string
  color?: 'purple' | 'blue' | 'green' | 'red' | 'yellow'
}) {
  const colors = {
    purple: 'from-purple-600/20 to-purple-600/5 border-purple-500/20',
    blue: 'from-blue-600/20 to-blue-600/5 border-blue-500/20',
    green: 'from-green-600/20 to-green-600/5 border-green-500/20',
    red: 'from-red-600/20 to-red-600/5 border-red-500/20',
    yellow: 'from-yellow-600/20 to-yellow-600/5 border-yellow-500/20',
  }
  const iconColors = {
    purple: 'text-purple-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400',
    yellow: 'text-yellow-400',
  }

  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-6`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">{label}</span>
        <Icon className={`w-5 h-5 ${iconColors[color]}`} />
      </div>
      <div className="text-3xl font-bold text-white">{value}</div>
      {trend && <p className="text-xs text-gray-500 mt-2">{trend}</p>}
    </div>
  )
}
