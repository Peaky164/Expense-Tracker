export function getErrorMessage(err, fallback = 'Something went wrong') {
  const detail = err?.response?.data?.detail

  if (!detail) return fallback

  if (typeof detail === 'string') {
    return detail
  }

  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg).filter(Boolean).join(', ') || fallback
  }

  return fallback
}