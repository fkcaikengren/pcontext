import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DocInfoCard } from "@/components/doc-info-card";
import { 
  CheckCircle2, 
  Search,
  TrendingUp,
  Clock,
  FileText,
  ArrowUpDown,
  Copy,
  Link2,
  Send,
  Settings
} from 'lucide-react';
import { useParams } from 'react-router';
import { alovaInstance } from "@/lib/alova";
import { useRequest } from "alova/client";

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
	const params = useParams<{ docId: string }>();
	const docId = params.docId;
	const { loading, data: doc, error } = useRequest(
		() => alovaInstance.Get<DocDetailFromApi>(`/docs/${docId}`),
		{
			immediate: !!docId,
		}
	);
	const [message, setMessage] = useState('');
	const [activeTab, setActiveTab] = useState('chat');
	const [searchQuery, setSearchQuery] = useState('');
	const [contextText, setContextText] = useState('');
	const [contextLoading, setContextLoading] = useState(false);
	const [contextError, setContextError] = useState<string | null>(null);

  const suggestedQuestions = [
    "How do I install this library?",
    "Show me a quick start example",
    "What are the core concepts?"
	];

	const handleViewContext = async () => {
		if (!docId) return;
		try {
			setContextLoading(true);
			setContextError(null);
			const baseUrl = import.meta.env.VITE_BASE_URL;
			const params = new URLSearchParams();
			if (searchQuery) params.set('topic', searchQuery);
			params.set('tokens', '10000');
			const url = `${baseUrl}/api/docs/${docId}/llm.txt?${params.toString()}`;
			const res = await fetch(url, { credentials: 'include' });
			if (!res.ok) {
				throw new Error(`请求失败: ${res.status}`);
			}
			const text = await res.text();
			setContextText(text);
		} catch (err) {
			const message = err instanceof Error ? err.message : '加载上下文失败';
			setContextError(message);
		} finally {
			setContextLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<main className="max-w-5xl mx-auto px-6 py-8">
				<DocInfoCard
					title={doc?.name || "文档详情"}
					url={doc?.url}
					description={doc ? undefined : loading ? "加载中..." : (error ? error.message : undefined)}
          status='completed'
					labels={doc ? [
						`来源: ${doc.source}`,
						`访问次数: ${doc.accessCount}`,
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
            <Card className="p-8 bg-white border-2 border-gray-200 rounded-2xl min-h-[600px] flex flex-col">
              <div className="flex items-center gap-2 mb-6 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                <span>History</span>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center">
                <h2 className="text-xl font-semibold mb-8 text-gray-700">
                  Start a conversation
                </h2>
                <div className="space-y-3">
                  {suggestedQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      className="block px-6 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                      onClick={() => setMessage(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-6 border-t">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask a question..."
                  className="flex-1"
                />
                <Button className="bg-green-600 hover:bg-green-700 gap-2">
                  Send
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </Card>
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
								disabled={contextLoading || !docId}
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
							{contextLoading && '加载中...'}
							{!contextLoading && contextError && `错误：${contextError}`}
							{!contextLoading && !contextError && contextText && contextText}
							{!contextLoading && !contextError && !contextText && '暂无内容，请在上方输入查询内容并点击“查看结果”。'}
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
