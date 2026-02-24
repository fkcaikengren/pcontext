
// 构建url
export function buildInternalUrl(path: string, params: Record<string, string>={}) {
  const search = new URLSearchParams(params).toString().trim()
  return `/web${path.startsWith('/') ? '' : '/'}${encodeURI(path)}${search.length > 0 ? '?' : ''}${search}`
}