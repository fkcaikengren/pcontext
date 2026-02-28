import { useState, useMemo, Fragment } from 'react';
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
      <Link to={`/docs/${doc.slug}`} className="block h-full group">
        <Card className="h-full border-border/60 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border cursor-pointer bg-card">
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted/70 rounded-lg flex items-center justify-center">
                  <DocSourceIcon source={doc.source} />
                </div>
                <h3 className="font-semibold text-base line-clamp-1 text-foreground group-hover:text-primary transition-colors">{doc.name}</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 transition-colors duration-200",
                  isFavorite && "text-yellow-500"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleToggleFavorite(doc.slug, !isFavorite);
                }}
                disabled={toggleFavoriteMutation.isPending}
              >
                <Star className={cn("w-4 h-4", isFavorite && "fill-current")} />
              </Button>
            </div>

            <span
              className="block text-sm text-foreground/70 whitespace-nowrap truncate mb-4 cursor-pointer hover:text-foreground hover:underline transition-colors"
              title={doc.url}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(doc.url, '_blank', 'noopener,noreferrer');
              }}
            >
              {formatDisplayUrl(doc.url, doc.source)}
            </span>

            <div className="flex items-center gap-4 text-sm mb-4">
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground">{formatNumber(doc.tokens)}</span>
                <span className="text-muted-foreground">Tokens</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium text-foreground">{formatNumber(doc.snippets)}</span>
                <span className="text-muted-foreground">Snippets</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-3">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>更新于 {formatRelativeTime(doc.updatedAt)}</span>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* GitHub 链接 */}
      <a
        href="https://github.com/fkcaikengren/pcontext"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-6 right-6 flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors duration-200"
        aria-label="GitHub 仓库"
      >
        <GithubIcon className="w-6 h-6 text-muted-foreground hover:text-foreground transition-colors" />
        <span className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">安装</span>
      </a>

      <main className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold tracking-tight mb-4 text-primary">
            Your Personal Context
          </h1>
          <h2 className="text-4xl font-bold tracking-tight text-foreground/80 mb-8">
            for Vibe Coding
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            一键复制最新文档和代码，粘贴到 Cursor、Claude 等 AI 编程助手
          </p>

          <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索文档库 (e.g. Next, React)"
                className="pl-12 h-14 text-base bg-card border-border/60 shadow-sm transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1"
              />
            </div>
          </div>
        </div>

        {searchQuery && (
          <div className="mb-10">
            <h3 className="text-lg font-semibold mb-5 text-foreground">搜索结果</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {isSearching ? (
                <div className="col-span-full flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : searchDocs.length > 0 ? (
                searchDocs.map((doc) => (
                  <Fragment key={doc.slug}>{renderDocCard(doc)}</Fragment>
                ))
              ) : (
                <div className="col-span-full text-center py-16 text-muted-foreground">
                  未找到相关文档
                </div>
              )}
            </div>
          </div>
        )}

        {!searchQuery && (
          <div className="mb-8">
            <Tabs value={urlState.tab} onValueChange={(value) => setUrlState({ tab: value as TabValue })}>
              <TabsList className="inline-flex bg-muted/50 rounded-lg border border-border/50 p-1">
                <TabsTrigger
                  value="popular"
                  className="gap-2 rounded-md text-sm font-medium text-muted-foreground transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold"
                >
                  <TrendingUp className="w-4 h-4" />
                  热门
                </TabsTrigger>
                <TabsTrigger
                  value="latest"
                  className="gap-2 rounded-md text-sm font-medium text-muted-foreground transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold"
                >
                  <Clock className="w-4 h-4" />
                  最新
                </TabsTrigger>
                <TabsTrigger
                  value="favorites"
                  className="gap-2 rounded-md text-sm font-medium text-muted-foreground transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold"
                >
                  <Star className="w-4 h-4" />
                  收藏
                </TabsTrigger>
              </TabsList>

              <TabsContent value="popular" className="mt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {isLoading ? (
                    <div className="col-span-full flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : popularDocs.length > 0 ? (
                    popularDocs.map((doc) => <Fragment key={doc.slug}>{renderDocCard(doc)}</Fragment>)
                  ) : (
                    <div className="col-span-full text-center py-16 text-muted-foreground">
                      暂无热门文档
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="latest" className="mt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {isLoading ? (
                    <div className="col-span-full flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : latestDocs.length > 0 ? (
                    latestDocs.map((doc) => <Fragment key={doc.slug}>{renderDocCard(doc)}</Fragment>)
                  ) : (
                    <div className="col-span-full text-center py-16 text-muted-foreground">
                      暂无最新文档
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="favorites" className="mt-8">
                {!isAuthenticated ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Star className="w-16 h-16 text-muted-foreground/30 mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">查看收藏的文档</h3>
                    <p className="text-muted-foreground mb-6">登录后查看您收藏的文档</p>
                    <Button
                      asChild
                      size="lg"
                      className="transition-all duration-200 ease-in-out active:scale-[0.98]"
                    >
                      <Link to="/login">
                        <LogIn className="w-4 h-4 mr-2" />
                        登录
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {isLoading ? (
                        <div className="col-span-full flex items-center justify-center py-16">
                          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : favoritesDocs.length > 0 ? (
                        favoritesDocs.map((doc) => <Fragment key={doc.slug}>{renderDocCard(doc)}</Fragment>)
                      ) : (
                        <div className="col-span-full text-center py-16 text-muted-foreground">
                          暂无收藏文档
                        </div>
                      )}
                    </div>

                    {favoritesTotal > 0 && (
                      <div className="mt-8 flex items-center justify-center gap-4">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={favoritesPage <= 1 || isLoading}
                          onClick={() => setFavoritesPage(p => p - 1)}
                          className="transition-all duration-200 ease-in-out active:scale-[0.98]"
                        >
                          上一页
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          第 {favoritesPage} / {favoritesTotalPages} 页
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={favoritesPage >= favoritesTotalPages || isLoading}
                          onClick={() => setFavoritesPage(p => p + 1)}
                          className="transition-all duration-200 ease-in-out active:scale-[0.98]"
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
