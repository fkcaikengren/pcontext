import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DocInfoCard } from "@/components/doc-info-card";
import { 
  TrendingUp,
  Clock,
  FileText,
  ArrowUpDown,
  Copy,
  Link2,
  Send,
  ExternalLink
} from 'lucide-react';
import { useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useUrlState } from '@/hooks/use-url-state';
import { Chat } from '@/components/chat';
import { copyToClipboard } from '@/lib/copy';
import { toast } from 'sonner';


import { client, parseRes } from '@/APIs'


export default function DocsDetail() {
	const params = useParams<{ docSlug: string }>();
	const {docSlug:slug} = params;

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'context';
  
  const setActiveTab = (tab: string) => {
    setSearchParams(prev => {
      prev.set('tab', tab);
      return prev;
    }, { replace: true });
  };

  const [urlState, setUrlState] = useUrlState({ topic: '', tokens: '10000' });
  const { topic, tokens } = urlState;

  if(!slug){
    return 
  }
	const docQuery = useQuery({
		queryKey: ['docs', 'detail', slug],
		enabled: !!slug,
		queryFn: async () => {
			const res = client.docs[':slug'].$get({ param: { slug } });
			return parseRes(res);
		},
	});
	
	const [searchQuery, setSearchQuery] = useState(topic || '');
	const [localTokens, setLocalTokens] = useState(tokens);

	useEffect(() => {
		setSearchQuery(topic || '');
	}, [topic]);

	useEffect(() => {
		setLocalTokens(tokens);
	}, [tokens]);

	const handleTokensBlur = () => {
		if (localTokens !== tokens) {
			setUrlState({ tokens: localTokens });
		}
	};

	const handleTokensKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.currentTarget.blur();
		}
	};

	const llmTextQuery = useQuery({
		queryKey: ['docs', slug, 'query', topic, tokens],
		enabled: !!(slug && topic),
		queryFn: async () => {
      const res = client.docs[':slug'].query.$get({
        param: { slug },
        query: { topic: encodeURIComponent(topic || ''), tokens },
      });
      return parseRes(res);
    },
	});


	const handleViewContext = () => {
    setUrlState({ topic: searchQuery });
    llmTextQuery.refetch();
  };

  const formattedContent = useMemo(() => {
    if (!llmTextQuery.data?.snippets) return '暂无内容';
    return llmTextQuery.data.snippets.map((snippet) => (
        `source: ${snippet.filePath}\n\n${snippet.content}\n\n---------------------------\n`
    )).join('');
  }, [llmTextQuery.data?.snippets]);

  const getLlmUrl = () => {
    const url = new URL(window.location.origin);
    url.pathname = `/web/docs/${slug}/llm.txt`;
    if (topic) url.searchParams.set('topic', topic);
    if (tokens) url.searchParams.set('tokens', tokens);
    return url.toString();
  };

  const handleCopyLink = () => {
    const url = getLlmUrl();
    copyToClipboard(url);
    toast.success('Link copied to clipboard');
  };

  const handleRawClick = () => {
    const url = getLlmUrl();
    window.open(url, '_blank');
  };

  const handleCopyContent = () => {
    if (!formattedContent) return;
    copyToClipboard(formattedContent);
    toast.success('Content copied to clipboard');
  };

	return (
		<div className="flex flex-1 flex-col items-center p-6 pt-16 md:p-8 md:pt-20">
      <div className="w-full max-w-4xl">
				<DocInfoCard
					title={docQuery.data?.name || "文档详情"}
					url={docQuery.data?.url}
					description={docQuery.data ? undefined : docQuery.isPending ? "加载中..." : (docQuery.isError ? docQuery.error.message : undefined)}
          status='completed'
					labels={docQuery.data ? [
						`来源: ${docQuery.data.source}`,
						// 更多信息
					] : []}
				/>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-8 mt-8">
            <TabsList className="bg-muted/50 p-1 rounded-lg border border-border/50">
              <TabsTrigger
                value="context"
                className="gap-2 rounded-md text-sm font-medium text-muted-foreground transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold"
              >
                <FileText className="w-4 h-4" />
                Context
              </TabsTrigger>
              <TabsTrigger
                value="chat"
                className="gap-2 rounded-md text-sm font-medium text-muted-foreground transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold"
              >
                <Send className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger
                value="benchmark"
                className="gap-2 rounded-md text-sm font-medium text-muted-foreground transition-all duration-200 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=active]:font-semibold"
              >
                <TrendingUp className="w-4 h-4" />
                Benchmark
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              {/* TODO: 版本 */}
              {/* <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="w-3 h-3" />
                Latest
              </Button> */}
            </div>
          </div>

          {/* Chat Tab */}
          <TabsContent value="chat" className="mt-0">
            <Chat libraryName={docQuery.data?.name || ''} />
          </TabsContent>

          {/* Context Tab */}
          <TabsContent value="context" className="mt-0">
            <div className="mt-6 p-6 bg-card border border-border/60 shadow-sm rounded-xl">
              <div className="flex gap-3">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="输入你要查询的内容"
                  className="flex-1 h-11 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1"
                />
                <Button
                  variant="outline"
                  onClick={handleViewContext}
                  disabled={llmTextQuery.isFetching || !slug}
                  className="transition-all duration-200 ease-in-out active:scale-[0.98]"
                >
                  查看结果
                </Button>
              </div>
            </div>

            <div className="mt-6 p-6 bg-card border border-border/60 shadow-sm rounded-xl">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  Tokens:
                  <Input
                    type="number"
                    value={localTokens}
                    onChange={(e) => setLocalTokens(e.target.value)}
                    onBlur={handleTokensBlur}
                    onKeyDown={handleTokensKeyDown}
                    className="w-24 h-8 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1"
                    min={1}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 transition-all duration-200 ease-in-out hover:bg-accent active:scale-[0.98]"
                    onClick={handleRawClick}
                  >
                    <ExternalLink className="w-4 h-4" />
                    打开
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 transition-all duration-200 ease-in-out hover:bg-accent active:scale-[0.98]"
                    onClick={handleCopyContent}
                  >
                    <Copy className="w-4 h-4" />
                    复制内容
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 transition-all duration-200 ease-in-out hover:bg-accent active:scale-[0.98]"
                    onClick={handleCopyLink}
                  >
                    <Link2 className="w-4 h-4" />
                    复制链接
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96 border border-border/50 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/60">
                <pre className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {llmTextQuery.isFetching && '加载中...'}
                  {!llmTextQuery.isFetching && llmTextQuery.isError && `错误：${llmTextQuery.error.message}`}
                  {!llmTextQuery.isFetching && !llmTextQuery.isError && formattedContent}
                </pre>
              </div>
            </div>
          </TabsContent>

          {/* Benchmark Tab */}
          <TabsContent value="benchmark" className="mt-0">
            <Card className="p-8 bg-card border border-border/60 shadow-sm rounded-xl">
              <p className="text-muted-foreground text-center py-12">计划中...</p>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
