import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { images } from '@/assets/images';
import { MessageSquare, FileText, BarChart3, Menu, LogOut, User, Activity, History } from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: '智能对话', href: '/', icon: MessageSquare },
  { name: '数据记录', href: '/records', icon: FileText },
  { name: '数据分析', href: '/analysis', icon: BarChart3 },
  { name: '历史记录', href: '/history', icon: History },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex min-h-screen w-full flex-col xl:flex-row">
      {/* 桌面端侧边栏 - 毛玻璃效果 */}
      <aside className="hidden xl:flex xl:w-64 xl:flex-col xl:fixed xl:inset-y-0 glass-card border-r border-white/30">

        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 rounded-3xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-primary/20 to-accent/20 text-primary shadow-md scale-105'
                    : 'text-sidebar-foreground hover:bg-white/50 hover:scale-102'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
          
          {/* 管理员专属入口 */}
          {profile?.role === 'admin' && (
            <>
              <div className="my-2 border-t border-white/30" />
              <Link
                to="/admin"
                className={`flex items-center gap-3 rounded-3xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                  location.pathname === '/admin'
                    ? 'bg-gradient-to-r from-primary/20 to-accent/20 text-primary shadow-md scale-105'
                    : 'text-sidebar-foreground hover:bg-white/50 hover:scale-102'
                }`}
              >
                <Activity className="h-5 w-5" />
                Agent监控
              </Link>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {profile?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-sm">
                  <span className="font-medium">{profile?.username}</span>
                  <span className="text-xs text-muted-foreground">
                    {profile?.role === 'admin' ? '管理员' : '用户'}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>我的账户</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  个人资料
                </Link>
              </DropdownMenuItem>
              {profile?.role === 'admin' && (
                <DropdownMenuItem asChild>
                  <Link to="/admin" className="flex items-center cursor-pointer">
                    <Activity className="mr-2 h-4 w-4" />
                    Agent监控
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
      {/* 移动端顶部导航 - 毛玻璃效果 */}
      <div className="xl:hidden flex items-center justify-between h-16 px-4 border-b glass-card border-white/30 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden shadow-lg ring-2 ring-primary/20">
            <img 
              src={images.drSugarAvatar} 
              alt="糖博士" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="font-bold gradient-text">糖博士</h1>
            <p className="text-xs text-muted-foreground">Dr. Sugar</p>
          </div>
        </div>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 glass-card border-white/30">
            <div className="flex h-16 items-center gap-3 px-6 border-b border-white/30">
              <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg ring-2 ring-primary/20">
                <img 
                  src={images.drSugarAvatar} 
                  alt="糖博士" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className="font-bold gradient-text">糖博士</h1>
                <p className="text-xs text-muted-foreground">Dr. Sugar</p>
              </div>
            </div>
            
            <nav className="flex-1 space-y-1 p-4">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-3xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-r from-primary/20 to-accent/20 text-primary shadow-md scale-105'
                        : 'hover:bg-white/50 hover:scale-102'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
              
              {/* 管理员专属入口 */}
              {profile?.role === 'admin' && (
                <>
                  <div className="my-2 border-t border-white/30" />
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-3xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
                      location.pathname === '/admin'
                        ? 'bg-gradient-to-r from-primary/20 to-accent/20 text-primary shadow-md scale-105'
                        : 'hover:bg-white/50 hover:scale-102'
                    }`}
                  >
                    <Activity className="h-5 w-5" />
                    Agent监控
                  </Link>
                </>
              )}
            </nav>

            <div className="p-4 border-t border-white/30">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-bold">
                    {profile?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-sm">
                  <span className="font-medium">{profile?.username}</span>
                  <span className="text-xs text-muted-foreground">
                    {profile?.role === 'admin' ? '管理员' : '用户'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start rounded-3xl" asChild>
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                    <User className="mr-2 h-4 w-4" />
                    个人资料
                  </Link>
                </Button>
                {profile?.role === 'admin' && (
                  <Button variant="outline" className="w-full justify-start rounded-3xl" asChild>
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                      <Activity className="mr-2 h-4 w-4" />
                      Agent监控
                    </Link>
                  </Button>
                )}
                <Button variant="outline" className="w-full justify-start rounded-3xl" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  退出登录
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      {/* 主内容区域 */}
      <main className="flex-1 xl:ml-64">
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
