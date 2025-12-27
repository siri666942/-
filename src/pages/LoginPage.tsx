import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { images } from '@/assets/images';
import { toast } from 'sonner';
import { Activity } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from || '/';

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('请输入用户名和密码');
      return;
    }

    // 验证用户名格式
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      toast.error('用户名只能包含字母、数字和下划线');
      return;
    }

    setLoading(true);
    const { error } = await signIn(username, password);
    setLoading(false);

    if (error) {
      toast.error('登录失败：' + error.message);
    } else {
      toast.success('登录成功！');
      navigate(from, { replace: true });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('请输入用户名和密码');
      return;
    }

    // 验证用户名格式
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      toast.error('用户名只能包含字母、数字和下划线');
      return;
    }

    if (password.length < 6) {
      toast.error('密码长度至少为6位');
      return;
    }

    setLoading(true);
    const { error } = await signUp(username, password);
    setLoading(false);

    if (error) {
      toast.error('注册失败：' + error.message);
    } else {
      toast.success('注册成功！正在登录...');
      // 注册成功后自动登录
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-accent/30 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-24 h-24 rounded-full overflow-hidden shadow-lg ring-4 ring-primary/20">
            <img 
              src={images.drSugarAvatar} 
              alt="糖博士" 
              className="w-full h-full object-cover"
            />
          </div>
          <CardTitle className="text-2xl gradient-text">糖博士</CardTitle>
          <CardDescription>
            智能对话，专业管理，温暖陪伴
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">登录</TabsTrigger>
              <TabsTrigger value="signup">注册</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-username">用户名</Label>
                  <Input
                    id="signin-username"
                    type="text"
                    placeholder="请输入用户名"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">密码</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? '登录中...' : '登录'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">用户名</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="字母、数字、下划线"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">密码</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="至少6位"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? '注册中...' : '注册'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
