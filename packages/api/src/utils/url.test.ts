import { buildGitDocIdentifier, buildWebsiteDocIdentifier, buildDocIdentifiersFromUrl } from './url'

describe('buildGitDocIdentifier', () => {
  it('builds identifier for https git url', () => {
    const result = buildGitDocIdentifier('https://github.com/fkcaikengren/uni-hooks')
    expect(result.slug).toBe('github_fkcaikengren_uni-hooks')
    expect(result.docName).toBe('fkcaikengren uni-hooks')
  })

  it('builds identifier for ssh git url', () => {
    const result = buildGitDocIdentifier('git@github.com:fkcaikengren/uni-hooks.git')
    expect(result.slug).toBe('github_fkcaikengren_uni-hooks')
    expect(result.docName).toBe('fkcaikengren uni-hooks')
  })
})

describe('buildWebsiteDocIdentifier', () => {
  it('builds identifier for root website url', () => {
    const result = buildWebsiteDocIdentifier('https://docs.example.com')
    expect(result.slug).toBe('docs_example')
    expect(result.docName).toBe('example')
  })

  it('builds identifier for website url with path', () => {
    const result = buildWebsiteDocIdentifier('https://pcontext.ai/docs/getting-started')
    expect(result.slug).toBe('pcontext_docs_getting-started')
    expect(result.docName).toBe('pcontext docs getting-started')
  })
})

describe('buildDocIdentifiersFromUrl', () => {
	it('uses git builder when source is git', () => {
		const result = buildDocIdentifiersFromUrl('git@github.com:drizzle-team/drizzle-orm.git', 'git')
		expect(result.slug).toBe('github_drizzle-team_drizzle-orm')
		expect(result.docName).toBe('drizzle-team drizzle-orm')
	})

	it('uses website builder when source is website', () => {
		const result = buildDocIdentifiersFromUrl('https://docs.example.com/guide/intro', 'website')
		expect(result.slug).toBe('docs_example_guide_intro')
		expect(result.docName).toBe('example guide intro')
	})
})
