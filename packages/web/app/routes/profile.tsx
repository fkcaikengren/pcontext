import { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth';

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!user) {
    return null;
  }

  const createdAt = user.createdAt ? new Date(user.createdAt) : null;
  const updatedAt = user.updatedAt ? new Date(user.updatedAt) : null;

  const displayName = user.name || user.username || 'User';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((item) => item[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex w-full flex-1 items-start justify-center bg-slate-50 px-4 py-8">
      <Card className="w-full max-w-2xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl font-semibold text-slate-900">
                {displayName}
              </CardTitle>
              <p className="text-sm text-slate-500">{user.email || user.username || '-'}</p>
            </div>
          </div>
          <Badge variant="outline" className="uppercase">
            {user.role}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-2">
            <div>
              <p className="text-slate-400">用户名</p>
              <p className="font-medium">{user.username || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400">手机号</p>
              <p className="font-medium">{user.phone || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400">邮箱</p>
              <p className="font-medium">{user.email || '-'}</p>
            </div>
            <div>
              <p className="text-slate-400">状态</p>
              <p className="font-medium">{user.status || 'active'}</p>
            </div>
          </div>

          <div className="grid gap-4 rounded-lg border border-dashed border-slate-200 p-4 text-xs text-slate-500 sm:grid-cols-2">
            <div>
              <p className="mb-1 font-medium text-slate-400">创建时间</p>
              <p>{createdAt ? createdAt.toLocaleString() : '-'}</p>
            </div>
            <div>
              <p className="mb-1 font-medium text-slate-400">最近更新</p>
              <p>{updatedAt ? updatedAt.toLocaleString() : '-'}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              登录令牌已安全存储，用于访问受保护的 API。
            </div>
            <Button
              variant="outline"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              退出登录
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
