import { useState } from 'react';
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
  Send
} from 'lucide-react';
import { useParams, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Chat } from '@/components/chat';

// import {client } from '@pcontext/api'

import { client, parseRes } from '@/APIs'

interface DocDetailFromApi {
	id: number
	name: string
	source: "git" | "website"
	url: string
	accessCount: number
	createdAt: string | number
	updatedAt: string | number
}






export default function DocsDetail() {
	const params = useParams<{ docSlug: string; topic:string; tokens:string }>();
	const {docSlug:slug , topic, tokens} = params;
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'chat';
  
  const setActiveTab = (tab: string) => {
    setSearchParams(prev => {
      prev.set('tab', tab);
      return prev;
    }, { replace: true });
  };

  if(!slug){
    return 
  }
	const docQuery = useQuery({
		queryKey: ['docs', 'detail', slug],
		enabled: !!slug,
		queryFn: async () => parseRes(client.docs[':slug'].$get({ param: { slug } })),
	});
	
	const [searchQuery, setSearchQuery] = useState('');
	const llmTextQuery = useQuery({
		queryKey: ['docs', slug, 'llm.txt', searchQuery],
		enabled: false,
		queryFn: async () => {
      const res = await client.docs[':slug']['llm.txt'].$get({
        param: { slug },
        query: { topic, tokens },
      });
      return res.text()
    },
	});


	const handleViewContext = async () => {
		if (!slug) return;
		await llmTextQuery.refetch();
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<main className="max-w-5xl mx-auto px-6 py-8">
				<DocInfoCard
					title={docQuery.data?.name || "文档详情"}
					url={docQuery.data?.url}
					description={docQuery.data ? undefined : docQuery.isPending ? "加载中..." : (docQuery.isError ? docQuery.error.message : undefined)}
          status='completed'
					labels={docQuery.data ? [
						`来源: ${docQuery.data.source}`,
						`访问次数: ${docQuery.data.accessCount}`,
					] : []}
				/>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="bg-white border border-gray-200">
              <TabsTrigger value="context" className="gap-2">
                <FileText className="w-4 h-4" />
                Context
              </TabsTrigger>
              <TabsTrigger value="chat" className="gap-2">
                <Send className="w-4 h-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="benchmark" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Benchmark
                <Badge variant="secondary" className="ml-1">74.4</Badge>
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Clock className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <ArrowUpDown className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="w-3 h-3" />
                Latest
              </Button>
            </div>
          </div>

          {/* Chat Tab */}
          <TabsContent value="chat" className="mt-0">
            <Chat libraryName={slug} />
          </TabsContent>

          {/* Context Tab */}
          <TabsContent value="context" className="mt-0">
            <Card className="p-6 bg-white border-2 border-gray-200 rounded-2xl">
              <div className="mb-6">
                <div className="flex gap-3">
							<Input
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="输入你要查询的内容"
								className="flex-1"
							/>
							<Button
								variant="outline"
								onClick={handleViewContext}
								disabled={llmTextQuery.isFetching || !slug}
							>
								查看结果
							</Button>
                </div>
              </div>

              <div className="border rounded-lg p-6 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-600">
                    Tokens: <span className="font-mono">10000</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileText className="w-4 h-4" />
                      Raw
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Copy className="w-4 h-4" />
                      Copy
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Link2 className="w-4 h-4" />
                      Link
                    </Button>
                  </div>
                </div>

					<div className="bg-white p-4 rounded border font-mono text-sm overflow-auto max-h-96">
						<pre className="text-gray-800 whitespace-pre-wrap">
							{llmTextQuery.isFetching && '加载中...'}
							{!llmTextQuery.isFetching && llmTextQuery.isError && `错误：${llmTextQuery.error.message}`}
							{!llmTextQuery.isFetching && !llmTextQuery.isError && llmTextQuery.data && llmTextQuery.data}
							{!llmTextQuery.isFetching && !llmTextQuery.isError && !llmTextQuery.data && '暂无内容，请在上方输入查询内容并点击“查看结果”。'}
						</pre>
					</div>
              </div>
            </Card>
          </TabsContent>

          {/* Benchmark Tab */}
          <TabsContent value="benchmark" className="mt-0">
            <Card className="p-6 bg-white border-2 border-gray-200 rounded-2xl">
              <p className="text-gray-500 text-center py-12">Benchmark data would be displayed here</p>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
