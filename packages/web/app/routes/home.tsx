import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Search,
  TrendingUp,
  Clock,
  Star,
  Github,
  Globe
} from 'lucide-react';
import { Link } from 'react-router';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('popular');

  const libraries = [
    { name: 'Next.js', source: '/vercel/next.js', icon: <Github className="w-4 h-4" />, tokens: '550K', snippets: '4.1K', update: '6 days' },
    { name: 'Better Auth', source: '/better-auth/better-auth', icon: <Github className="w-4 h-4" />, tokens: '418K', snippets: '2.3K', update: '1 day' },
    { name: 'Vercel AI SDK', source: '/vercel/ai', icon: <Github className="w-4 h-4" />, tokens: '764K', snippets: '3.6K', update: '6 days' },
    { name: 'MongoDB', source: '/mongodb/docs', icon: <Github className="w-4 h-4" />, tokens: '3.3M', snippets: '20K', update: '2 weeks' },
    { name: 'LangGraph', source: '/langchain-ai/langgraph', icon: <Github className="w-4 h-4" />, tokens: '703K', snippets: '2.3K', update: '11 hours' },
    { name: 'Tailwind CSS', source: 'tailwindcss.com/docs', icon: <Globe className="w-4 h-4" />, tokens: '317K', snippets: '2.4K', update: '23 hours' },
    { name: 'Prisma', source: '/prisma/docs', icon: <Github className="w-4 h-4" />, tokens: '915K', snippets: '6K', update: '2 weeks' },
    { name: 'Shadcn UI', source: '/shadcn-ui/ui', icon: <Github className="w-4 h-4" />, tokens: '136K', snippets: '761', update: '1 day' },
    { name: 'TanStack Start', source: 'tanstack.com/start/latest/d...', icon: <Globe className="w-4 h-4" />, tokens: '127K', snippets: '598', update: '2 weeks' },
    { name: 'SwiftUI', source: 'developer.apple.com/docu...', icon: <Globe className="w-4 h-4" />, tokens: '2M', snippets: '13K', update: '4 days' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero Section */}
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

        {/* Filters */}
        <div className="mb-6">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <Button
              variant={activeFilter === 'popular' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveFilter('popular')}
              className="gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Popular
            </Button>
            <Button
              variant={activeFilter === 'new' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveFilter('new')}
              className="gap-2"
            >
              <Clock className="w-4 h-4" />
              New & Noteworthy
            </Button>
            <Button
              variant={activeFilter === 'favorites' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveFilter('favorites')}
              className="gap-2"
            >
              <Star className="w-4 h-4" />
              Favorites
            </Button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {libraries.map((lib) => (
            <Link key={lib.name} to={`/docs/${encodeURIComponent(lib.name)}`}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-gray-200">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      {lib.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{lib.name}</h3>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <span className="font-mono bg-gray-100 px-1 rounded">{lib.source}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-yellow-400">
                    <Star className="w-5 h-5" />
                  </Button>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{lib.tokens}</span>
                    <span className="text-gray-400">Tokens</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{lib.snippets}</span>
                    <span className="text-gray-400">Snippets</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span>Updated {lib.update}</span>
                  </div>
                </div>
              </div>
            </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
