export function DataState({ loading, error, empty, children }) {
  if (loading) return <p className="text-purple-200">Загрузка…</p>
  if (error) return <p className="text-rose-400">Ошибка: {error}</p>
  if (empty != null) return empty
  return children
}
