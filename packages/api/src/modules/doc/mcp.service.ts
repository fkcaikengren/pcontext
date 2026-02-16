import { z } from 'zod'
import { queryDocSnippets } from '@/modules/doc/doc.service'
import { getRepoDeps } from '@/shared/deps'
import { createTool } from '@/shared/mcp/createTool'

function normalizeText(input: string) {
  return input.trim().toLowerCase()
}

function scoreMatch(name: string, q: string) {
  const n = normalizeText(name)
  const query = normalizeText(q)
  if (!query)
    return 0
  if (n === query)
    return 30
  if (n.startsWith(query))
    return 20
  if (n.includes(query))
    return 10
  return 0
}

export const resolveLibraryIdTool = createTool({
  name: 'resolve-library-id',
  title: 'Resolve Library ID',
  description: `Resolves a package/product name to a Context7-compatible library ID and returns matching libraries.

You MUST call this function before 'query-docs' to obtain a valid Context7-compatible library ID UNLESS the user explicitly provides a library ID in the format '/org/project' or '/org/project/version' in their query.

Selection Process:
1. Analyze the query to understand what library/package the user is looking for
2. Return the most relevant match based on:
- Name similarity to the query (exact matches prioritized)
- Description relevance to the query's intent
- Documentation coverage (prioritize libraries with higher Code Snippets counts)
- Source Reputation (consider libraries with High or Medium reputation more authoritative)
- Benchmark Score: Quality indicator (100 is the highest score)

Response Format:
- Return the selected library ID in a clearly marked section
- Provide a brief explanation for why this library was chosen
- If multiple good matches exist, acknowledge this but proceed with the most relevant one
- If no good matches exist, clearly state this and suggest query refinements

For ambiguous queries, request clarification before proceeding with a best-guess match.

IMPORTANT: Do not call this tool more than 3 times per question. If you cannot find what you need after 3 calls, use the best result you have.`,
  schema: z.object({
    query: z.string().describe('The user\'s original question or task. This is used to rank library results by relevance to what the user is trying to accomplish. IMPORTANT: Do not include any sensitive or confidential information such as API keys, passwords, credentials, or personal data in your query.'),
    libraryName: z.string().describe('Library name to search for and retrieve a Context7-compatible library ID.'),
  }),
  handler: async ({ query: _query, libraryName }) => {
    const { docRepo } = getRepoDeps()
    // limit 默认为 10，这里 hardcode 为 10
    const limit = 10
    const result = await docRepo.list(1, limit, { q: libraryName })

    const matches = result.list
      .map((doc) => {
        return {
          slug: doc.slug,
          name: doc.name,
          source: doc.source,
          url: doc.url,
          score: scoreMatch(doc.name, libraryName),
        }
      })
      .sort((a, b) => b.score - a.score)

    const matchesText = matches.map(m => `
Library ID: ${m.slug}
Name: ${m.name}
Description: Documentation for ${m.name}
Code Snippets: Unknown
Source Reputation: Unknown
Benchmark Score: Unknown
Versions: Latest
`).join('\n----------\n')

    const responseText = `
Available Libraries:

Each result includes:
- Library ID: Context7-compatible identifier (format: /org/project)
- Name: Library or package name
- Description: Short summary
- Code Snippets: Number of available code examples
- Source Reputation: Authority indicator (High, Medium, Low, or Unknown)
- Benchmark Score: Quality indicator (100 is the highest score)
- Versions: List of versions if available. Use one of those versions if the user provides a version in their query. The format of the version is /org/project/version.

For best results, select libraries based on name match, source reputation, snippet coverage, benchmark score, and relevance to your use case.
----------
${matchesText}
`

    return {
      content: [{ type: 'text', text: responseText }],
      structuredContent: { matches },
    }
  },
})

export const queryDocsTool = createTool({
  name: 'query-docs',
  title: 'Query Docs',
  description: `Retrieves and queries up-to-date documentation and code examples from Context7 for any programming library or framework.

You must call 'resolve-library-id' first to obtain the exact Context7-compatible library ID required to use this tool, UNLESS the user explicitly provides a library ID in the format '/org/project' or '/org/project/version' in their query.

IMPORTANT: Do not call this tool more than 3 times per question. If you cannot find what you need after 3 calls, use the best information you have.`,
  schema: z.object({
    libraryId: z.string().describe('Exact Context7-compatible library ID (e.g., \'/mongodb/docs\', \'/vercel/next.js\', \'/supabase/supabase\', \'/vercel/next.js/v14.3.0-canary.87\') retrieved from \'resolve-library-id\' or directly from user query in the format \'/org/project\' or \'/org/project/version\'.'),
    query: z.string().describe('The question or task you need help with. Be specific and include relevant details. Good: \'How to setup authentication with JWT in Express.js\' or \'React useEffect cleanup function examples\'. Bad: \'auth\' or \'hooks\'. IMPORTANT: Do not include any sensitive or confidential information such as API keys, passwords, credentials, or personal data in your query.'),
  }),
  handler: async ({ libraryId, query }) => {
    // Default tokens to 10000 as per previous implementation logic
    const tokens = 10000
    const { snippets } = await queryDocSnippets(libraryId, query, tokens)

    if (snippets.length === 0) {
      return { content: [{ type: 'text', text: `未找到相关文档片段：${libraryId}` }] }
    }

    const llmText = snippets.map(n => `### ${n.filePath}\n${n.content}`).join('\n----------\n')

    return {
      content: [{ type: 'text', text: llmText }],
    }
  },
})

export const docMcpTools = [resolveLibraryIdTool, queryDocsTool] as const
