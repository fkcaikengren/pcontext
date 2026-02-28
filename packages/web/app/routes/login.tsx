import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth';
import GithubIcon from '@/components/icons/github.svg?react';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    setSubmitting(true);

    try {
      await login({ username, password });
      navigate('/profile');
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败，请稍后重试';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-primary mb-2">
            PContext
          </h1>
          <p className="text-sm text-muted-foreground">
            您的个人 AI 编程助手知识库
          </p>
        </div>

        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold tracking-tight text-foreground text-center">
              登录
            </CardTitle>
            <CardDescription className="text-center mt-1">
              输入您的账户信息以继续
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-foreground">
                  用户名
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="请输入用户名"
                  autoComplete="username"
                  required
                  className="h-10 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  密码
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  required
                  className="h-10 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/5 px-3 py-2 rounded-md" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full h-10 transition-all duration-200 ease-in-out active:scale-[0.98]"
                disabled={submitting}
              >
                {submitting ? '登录中...' : '登录'}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    或
                  </span>
                </div>
              </div>

              <a
                href="https://github.com/fkcaikengren/pcontext"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-10 border border-border/60 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-200"
              >
                <GithubIcon className="w-4 h-4" />
                <span>在 GitHub 上查看</span>
              </a>

              <p className="text-center text-xs text-muted-foreground">
                <Link to="/" className="text-primary hover:underline underline-offset-2 transition-colors">
                  返回首页
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
