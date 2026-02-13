import gitUrlParse from 'git-url-parse'

export type DocIdentifier = {
  slug: string
  docName: string
}

function getDomainWithoutTld(hostname: string) {
  const parts = hostname.split('.').filter(Boolean)
  if (parts.length >= 2) return parts[parts.length - 2]
  return parts[0] || ''
}

function getHostPartsWithoutTld(hostname: string) {
  const parts = hostname.split('.').filter(Boolean)
  if (parts.length <= 1) return parts
  return parts.slice(0, parts.length - 1)
}

export function buildGitDocIdentifier(url: string): DocIdentifier {
  const parsed = gitUrlParse(url)
  const resource = parsed.resource || parsed.source || ''
  const domain = getDomainWithoutTld(resource)
  const owner = parsed.owner || ''
  const name = parsed.name || ''
  const pathSegments = [owner, name].filter(Boolean)
  const slug = [domain, ...pathSegments].filter(Boolean).join('_')
  const docName = pathSegments[pathSegments.length - 1] || domain
  return { slug, docName }
}

export function buildWebsiteDocIdentifier(rawUrl: string): DocIdentifier {
  const parsed = new URL(rawUrl)
  const hostParts = getHostPartsWithoutTld(parsed.hostname)
  const hostSlugPart = hostParts.join('_')
  const pathSegments = parsed.pathname.split('/').filter(Boolean)
  const slug = [hostSlugPart, ...pathSegments].filter(Boolean).join('_')
  const secondLevel = hostParts.length >= 1 ? hostParts[hostParts.length - 1] : ''
  const docName = [secondLevel, ...pathSegments].filter(Boolean).join(' ')
  return { slug, docName }
}

export function buildDocIdentifiersFromUrl(url: string, source: 'git' | 'website'): DocIdentifier {
  return source === 'git' ? buildGitDocIdentifier(url) : buildWebsiteDocIdentifier(url)
}
