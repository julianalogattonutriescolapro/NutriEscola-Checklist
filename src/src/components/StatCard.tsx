export default function StatCard({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'positive' | 'negative' | 'neutral' }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className={`value mono ${tone}`}>{value}</div>
    </div>
  )
}
