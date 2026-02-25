import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle2,
  Search,
  TrendingUp,
  Clock,
  Star,
  Github,
  Globe,
  Loader2,
  LogIn
} from 'lucide-react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { client, parseRes } from '@/APIs';
import type { RankedDocVO, DocVO, PaginationVO } from '@pcontext/api/client';
import { useUrlState } from '@/hooks/use-url-state';
import { useAuthStore } from '@/stores/auth';

type TabValue = 'popular' | 'latest' | 'favorites';

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [urlState, setUrlState] = useUrlState<{ tab: TabValue }>({ tab: 'popular' });
  const [favoritesPage, setFavoritesPage] = useState(1);
  const [favoritesPageSize] = useState(10);

  const { isAuthenticated } = useAuthStore();

  const { data: popularDocsData, isPending: isLoadingPopular } = useQuery({
    queryKey: ['ranking', 'docs', { limit: 10 }],
    queryFn: () => parseRes(client.ranking.docs.$get({ query: { limit: 10 } })),
    enabled: urlState.tab === 'popular',
  });

  const { data: latestDocsData, isPending: isLoadingLatest } = useQuery({
    queryKey: ['docs', 'latest', { limit: 10 }],
    queryFn: () => parseRes(client.docs.latest.$get({ query: { limit: 10 } })),
    enabled: urlState.tab === 'latest',
  });

  const { data: favoritesData, isPending: isLoadingFavorites } = useQuery({
    queryKey: ['docs', 'favorites', { page: favoritesPage, pageSize: favoritesPageSize }],
    queryFn: () => parseRes(client.docs.favorites.$get({ query: { page: favoritesPage.toString(), pageSize: favoritesPageSize.toString() } })),
    enabled: urlState.tab === 'favorites' && isAuthenticated,
  });

  const popularDocs = popularDocsData?.docs ?? [];
  const latestDocs = latestDocsData ?? [];
  const favoritesDocs = favoritesData?.list ?? [];
  const favoritesTotal = favoritesData?.total ?? 0;
  const favoritesTotalPages = favoritesData?.totalPages ?? 1;

  const isLoading = urlState.tab === 'popular' ? isLoadingPopular : urlState.tab === 'latest' ? isLoadingLatest : isLoadingFavorites;

  const renderDocCard = (doc: RankedDocVO | DocVO) => {
    const isRanked = 'score' in doc;
    return (
      <Link key={doc.id} to={`/docs/${encodeURIComponent(doc.slug)}`}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-gray-200">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  {doc.source === 'github' ? <Github className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{doc.name}</h3>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="font-mono bg-gray-100 px-1 rounded">{doc.slug}</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-yellow-400">
                <Star className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-1">
                <span className="font-semibold">{formatNumber(doc.tokens)}</span>
                <span className="text-gray-400">Tokens</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold">{formatNumber(doc.snippets)}</span>
                <span className="text-gray-400">Snippets</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>Updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-primary">
            Your Personal Context
          </h1>
          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            for Vibe Coding 
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Copy latest docs & code — paste into Cursor, Claude, or other LLMs
          </p>
          
          <div className="flex items-center justify-center gap-4 max-w-3xl mx-auto">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search a library (e.g. Next, React)"
                className="pl-10 py-6 text-base"
              />
            </div>
            <span className="text-gray-400">or</span>
            <Button size="lg" variant="outline" className="px-8 py-6">
              Chat with Docs
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <Tabs value={urlState.tab} onValueChange={(value) => setUrlState({ tab: value as TabValue })}>
            <TabsList className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
              <TabsTrigger value="popular" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                热门
              </TabsTrigger>
              <TabsTrigger value="latest" className="gap-2">
                <Clock className="w-4 h-4" />
                最新
              </TabsTrigger>
              <TabsTrigger value="favorites" className="gap-2">
                <Star className="w-4 h-4" />
                收藏
              </TabsTrigger>
            </TabsList>

            <TabsContent value="popular" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                  <div className="col-span-full flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : popularDocs.length > 0 ? (
                  popularDocs.map(renderDocCard)
                ) : (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    暂无热门文档
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="latest" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                  <div className="col-span-full flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                  </div>
                ) : latestDocs.length > 0 ? (
                  latestDocs.map(renderDocCard)
                ) : (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    暂无最新文档
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="favorites" className="mt-6">
              {!isAuthenticated ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Star className="w-16 h-16 text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">查看收藏的文档</h3>
                  <p className="text-gray-500 mb-6">登录后查看您收藏的文档</p>
                  <Button asChild size="lg">
                    <Link to="/login">
                      <LogIn className="w-4 h-4 mr-2" />
                      登录
                    </Link>
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                      <div className="col-span-full flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                      </div>
                    ) : favoritesDocs.length > 0 ? (
                      favoritesDocs.map(renderDocCard)
                    ) : (
                      <div className="col-span-full text-center py-12 text-gray-500">
                        暂无收藏文档
                      </div>
                    )}
                  </div>

                  {favoritesTotal > 0 && (
                    <div className="mt-6 flex items-center justify-center gap-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={favoritesPage <= 1 || isLoading}
                        onClick={() => setFavoritesPage(p => p - 1)}
                      >
                        上一页
                      </Button>
                      <span className="text-sm text-gray-600">
                        第 {favoritesPage} / {favoritesTotalPages} 页
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={favoritesPage >= favoritesTotalPages || isLoading}
                        onClick={() => setFavoritesPage(p => p + 1)}
                      >
                        下一页
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
