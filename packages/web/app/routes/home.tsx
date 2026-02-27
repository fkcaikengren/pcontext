import { useState, useMemo } from 'react';
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
  Globe,
  Loader2,
  LogIn,
  Folder
} from 'lucide-react';
import GiteeIcon from '@/components/icons/gitee.svg?react';
import GithubIcon from '@/components/icons/github.svg?react';
import { Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { client, parseRes } from '@/APIs';
import type { RankedDocVO, DocVO } from '@pcontext/api/client';
import { useUrlState } from '@/hooks/use-url-state';
import { useDebounce } from '@/hooks/use-debounce';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatRelativeTime } from '@/utils/format';
import type { DocSourceEnumDTO } from '@pcontext/api/client';

type TabValue = 'popular' | 'latest' | 'favorites';

function DocSourceIcon({ source }: { source: DocSourceEnumDTO }) {
  const iconClassName = "w-4 h-4";
  switch (source) {
    case 'github':
      return <GithubIcon className={iconClassName} />;
    case 'gitee':
      return (
        <GiteeIcon className={iconClassName} />
      );
    case 'website':
      return <Globe className={iconClassName} />;
    default:
      return <Folder className={iconClassName} />;
  }
}

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
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [urlState, setUrlState] = useUrlState<{ tab: TabValue }>({ tab: 'popular' });
  const [favoritesPage, setFavoritesPage] = useState(1);
  const [favoritesPageSize] = useState(10);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

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

  const { data: searchResults, isPending: isSearching } = useQuery({
    queryKey: ['docs', 'search', { q: debouncedSearchQuery, limit: 6 }],
    queryFn: () => parseRes(client.docs.search.$get({ query: { q: debouncedSearchQuery, limit: 6 } })),
    enabled: debouncedSearchQuery.length > 0,
  });

  const popularDocs = popularDocsData?.docs ?? [];
  const latestDocs = latestDocsData ?? [];
  const favoritesDocs = favoritesData?.list ?? [];
  const favoritesTotal = favoritesData?.total ?? 0;
  const favoritesTotalPages = favoritesData?.totalPages ?? 1;
  const searchDocs = searchResults?.slice(0, 6) ?? [];

  const toggleFavoriteMutation = useMutation({
    mutationFn: async ({ slug, like }: { slug: string; like: boolean }) => {
      return parseRes(client.docs[':slug'].favorite.$post({
        param: { slug },
        json: { like }
      }));
    },
    onMutate: async ({ slug, like }) => {
      await queryClient.cancelQueries({ queryKey: ['docs'] });

      const previousData = {
        popular: queryClient.getQueryData(['ranking', 'docs', { limit: 10 }]),
        latest: queryClient.getQueryData(['docs', 'latest', { limit: 10 }]),
        favorites: queryClient.getQueryData(['docs', 'favorites', { page: favoritesPage, pageSize: favoritesPageSize }]),
        search: queryClient.getQueryData(['docs', 'search', { q: debouncedSearchQuery, limit: 10 }]),
      };

      const updateDocStarred = (doc: RankedDocVO | DocVO) => {
        if (doc.slug === slug) {
          return { ...doc, starred: like };
        }
        return doc;
      };

      queryClient.setQueryData(['ranking', 'docs', { limit: 10 }], (old: any) => {
        if (!old) return old;
        return { ...old, docs: old.docs.map(updateDocStarred) };
      });

      queryClient.setQueryData(['docs', 'latest', { limit: 10 }], (old: any) => {
        if (!old) return old;
        return old.map(updateDocStarred);
      });

      queryClient.setQueryData(['docs', 'favorites', { page: favoritesPage, pageSize: favoritesPageSize }], (old: any) => {
        if (!old) return old;
        return { ...old, list: old.list.map(updateDocStarred) };
      });

      queryClient.setQueryData(['docs', 'search', { q: debouncedSearchQuery, limit: 10 }], (old: any) => {
        if (!old) return old;
        return old.map(updateDocStarred);
      });

      return { previousData };
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['ranking', 'docs', { limit: 10 }], context.previousData.popular);
        queryClient.setQueryData(['docs', 'latest', { limit: 10 }], context.previousData.latest);
        queryClient.setQueryData(['docs', 'favorites', { page: favoritesPage, pageSize: favoritesPageSize }], context.previousData.favorites);
        queryClient.setQueryData(['docs', 'search', { q: debouncedSearchQuery, limit: 10 }], context.previousData.search);
      }
      toast.error(error.message || '操作失败');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['docs'] });
    },
    onSuccess: (data, variables) => {
      toast.success(variables.like ? '收藏成功' : '已取消收藏');
    }
  });

  const handleToggleFavorite = (slug: string, like: boolean) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    toggleFavoriteMutation.mutate({ slug, like });
  };

  const isLoading = urlState.tab === 'popular' ? isLoadingPopular : urlState.tab === 'latest' ? isLoadingLatest : isLoadingFavorites;

  // 处理 URL 显示：website 显示域名，github/gitee 显示路径
  const formatDisplayUrl = (url: string, source: DocSourceEnumDTO): string => {
    try {
      const urlObj = new URL(url);
      if (source === 'website') {
        // website 类型：仅显示域名
        return urlObj.hostname;
      }
      // github/gitee 类型：显示路径
      return urlObj.pathname;
    } catch {
      return url;
    }
  };

  const renderDocCard = (doc: RankedDocVO | DocVO) => {
    const isFavorite = doc.starred === true;

    return (
      <Link to={`/docs/${doc.slug}`} className="block h-full">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-gray-200 h-full">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <DocSourceIcon source={doc.source} />
                </div>
                <h3 className="font-semibold text-lg line-clamp-1 text-primary">{doc.name}</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "text-gray-400 hover:text-yellow-400 hover:bg-yellow-50",
                  isFavorite && "text-yellow-400"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleFavorite(doc.slug, !isFavorite);
                }}
                disabled={toggleFavoriteMutation.isPending}
              >
                <Star className={cn("w-5 h-5", isFavorite && "fill-current")} />
              </Button>
            </div>

            <a
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-black hover:underline whitespace-nowrap truncate mb-4"
              onClick={(e) => e.stopPropagation()}
            >
              {formatDisplayUrl(doc.url, doc.source)}
            </a>

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
                <span>更新于 {formatRelativeTime(doc.updatedAt)}</span>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* GitHub 链接 */}
      <a
        href="https://github.com/fkcaikengren/pcontext"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-6 right-6 flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="GitHub 仓库"
      >
        <GithubIcon className="w-6 h-6 text-gray-600 hover:text-gray-900" />
        <span className="text-gray-600 hover:text-gray-900 underline underline-offset-2">安装</span>
      </a>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-primary">
            Your Personal Context
          </h1>
          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            for Vibe Coding 
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            一键复制最新文档和代码，粘贴到 Cursor、Claude 等 AI 编程助手
          </p>
          
          <div className="flex items-center justify-center gap-4 max-w-3xl mx-auto">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索文档库 (e.g. Next, React)"
                className="pl-10 py-6 text-base"
              />
            </div>
           
          </div>
        </div>

        {searchQuery && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">搜索结果</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isSearching ? (
                <div className="col-span-full flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : searchDocs.length > 0 ? (
                searchDocs.map(renderDocCard)
              ) : (
                <div className="col-span-full text-center py-12 text-gray-500">
                  未找到相关文档
                </div>
              )}
            </div>
          </div>
        )}

        {!searchQuery && (
          <div className="mb-6">
            <Tabs value={urlState.tab} onValueChange={(value) => setUrlState({ tab: value as TabValue })}>
              <TabsList className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                <TabsTrigger value="popular" className="gap-2 data-[state=active]:text-primary">
                  <TrendingUp className="w-4 h-4" />
                  热门
                </TabsTrigger>
                <TabsTrigger value="latest" className="gap-2 data-[state=active]:text-primary">
                  <Clock className="w-4 h-4" />
                  最新
                </TabsTrigger>
                <TabsTrigger value="favorites" className="gap-2 data-[state=active]:text-primary">
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
        )}
      </main>

      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>需要登录</DialogTitle>
            <DialogDescription>
              请先登录后再收藏文档
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowLoginModal(false)}>
              取消
            </Button>
            <Button asChild onClick={() => setShowLoginModal(false)}>
              <Link to="/login">
                <LogIn className="w-4 h-4 mr-2" />
                登录
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
