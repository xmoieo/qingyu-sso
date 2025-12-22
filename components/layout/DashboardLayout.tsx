'use client';
/**
 * 仪表盘布局组件 - 包含抽屉菜单和标题栏
 */
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Box from '@mui/joy/Box';
import Sheet from '@mui/joy/Sheet';
import Typography from '@mui/joy/Typography';
import IconButton from '@mui/joy/IconButton';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListItemButton from '@mui/joy/ListItemButton';
import ListItemContent from '@mui/joy/ListItemContent';
import ListItemDecorator from '@mui/joy/ListItemDecorator';
import Dropdown from '@mui/joy/Dropdown';
import Menu from '@mui/joy/Menu';
import MenuButton from '@mui/joy/MenuButton';
import MenuItem from '@mui/joy/MenuItem';
import Avatar from '@mui/joy/Avatar';
import Divider from '@mui/joy/Divider';
import Drawer from '@mui/joy/Drawer';
import ModalClose from '@mui/joy/ModalClose';
import Tooltip from '@mui/joy/Tooltip';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import AppsIcon from '@mui/icons-material/Apps';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { UserRole } from '@/lib/types';

const DRAWER_WIDTH = 240;
const DRAWER_WIDTH_COLLAPSED = 64;

interface User {
  id: string;
  username: string;
  email: string;
  nickname?: string;
  avatar?: string;
  role: UserRole;
}

interface MenuItemType {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const menuItems: MenuItemType[] = [
  {
    path: '/dashboard',
    label: '仪表盘',
    icon: <DashboardIcon />,
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.USER],
  },
  {
    path: '/user',
    label: '个人信息',
    icon: <PersonIcon />,
    roles: [UserRole.ADMIN, UserRole.DEVELOPER, UserRole.USER],
  },
  {
    path: '/applications',
    label: '应用管理',
    icon: <AppsIcon />,
    roles: [UserRole.ADMIN, UserRole.DEVELOPER],
  },
  {
    path: '/users',
    label: '用户管理',
    icon: <PeopleIcon />,
    roles: [UserRole.ADMIN],
  },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [user, setUser] = useState<User | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 900);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 获取用户信息
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const result = await response.json();
        if (result.success) {
          setUser(result.data);
        } else {
          router.push('/login');
        }
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  // 过滤用户可见的菜单项
  const visibleMenuItems = menuItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  // 登出处理
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  // 导航处理
  const handleNavigate = (path: string) => {
    router.push(path);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  // 获取当前底部导航索引
  const getBottomNavValue = () => {
    const index = visibleMenuItems.findIndex((item) => item.path === pathname);
    return index >= 0 ? index : 0;
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <Typography>加载中...</Typography>
      </Box>
    );
  }

  if (!user) {
    return null;
  }

  const sidebarContent = (
    <List
      size="sm"
      sx={{
        gap: 1,
        '--List-nestedInsetStart': '30px',
        '--ListItem-radius': '8px',
      }}
    >
      {visibleMenuItems.map((item) => (
        <ListItem key={item.path}>
          <Tooltip title={!drawerOpen && !isMobile ? item.label : ''} placement="right">
            <ListItemButton
              selected={pathname === item.path}
              onClick={() => handleNavigate(item.path)}
              sx={{
                justifyContent: drawerOpen || isMobile ? 'initial' : 'center',
              }}
            >
              <ListItemDecorator
                sx={{
                  minWidth: 0,
                  mr: drawerOpen || isMobile ? 2 : 0,
                }}
              >
                {item.icon}
              </ListItemDecorator>
              {(drawerOpen || isMobile) && (
                <ListItemContent>
                  <Typography level="title-sm">{item.label}</Typography>
                </ListItemContent>
              )}
            </ListItemButton>
          </Tooltip>
        </ListItem>
      ))}
    </List>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* 顶部标题栏 */}
      <Sheet
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 64,
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          px: 2,
          gap: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.surface',
        }}
      >
        {isMobile ? (
          <IconButton
            variant="outlined"
            color="neutral"
            onClick={() => setMobileDrawerOpen(true)}
          >
            <MenuIcon />
          </IconButton>
        ) : (
          <IconButton
            variant="outlined"
            color="neutral"
            onClick={() => setDrawerOpen(!drawerOpen)}
          >
            {drawerOpen ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
        )}

        <Typography level="title-lg" sx={{ flexGrow: 1 }}>
          统一身份认证平台
        </Typography>

        <Dropdown>
          <MenuButton
            slots={{ root: IconButton }}
            slotProps={{ root: { variant: 'plain', color: 'neutral' } }}
          >
            {user.avatar ? (
              <Avatar src={user.avatar} size="sm" />
            ) : (
              <AccountCircleIcon />
            )}
          </MenuButton>
          <Menu placement="bottom-end">
            <MenuItem disabled>
              <Typography level="body-sm">
                {user.nickname || user.username}
              </Typography>
            </MenuItem>
            <MenuItem disabled>
              <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                {user.role === UserRole.ADMIN ? '管理员' : 
                 user.role === UserRole.DEVELOPER ? '开发者' : '普通用户'}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => handleNavigate('/user')}>
              <ListItemDecorator>
                <PersonIcon />
              </ListItemDecorator>
              个人信息
            </MenuItem>
            <MenuItem onClick={handleLogout} color="danger">
              <ListItemDecorator>
                <LogoutIcon />
              </ListItemDecorator>
              退出登录
            </MenuItem>
          </Menu>
        </Dropdown>
      </Sheet>

      {/* 侧边栏 - 桌面端 */}
      {!isMobile && (
        <Sheet
          sx={{
            position: 'fixed',
            top: 64,
            left: 0,
            bottom: 0,
            width: drawerOpen ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
            borderRight: '1px solid',
            borderColor: 'divider',
            transition: 'width 0.2s',
            overflow: 'hidden',
            p: 2,
          }}
        >
          {sidebarContent}
        </Sheet>
      )}

      {/* 侧边抽屉 - 移动端 */}
      <Drawer
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        sx={{ display: { xs: 'block', md: 'none' } }}
      >
        <Box sx={{ width: DRAWER_WIDTH, p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography level="title-lg">菜单</Typography>
            <ModalClose />
          </Box>
          {sidebarContent}
        </Box>
      </Drawer>

      {/* 主内容区域 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: '64px',
          ml: isMobile ? 0 : drawerOpen ? `${DRAWER_WIDTH}px` : `${DRAWER_WIDTH_COLLAPSED}px`,
          mb: isMobile ? '64px' : 0,
          transition: 'margin-left 0.2s',
        }}
      >
        {children}
      </Box>

      {/* 底部导航 - 仅移动端 */}
      {isMobile && (
        <Sheet
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.surface',
            zIndex: 1100,
          }}
        >
          {visibleMenuItems.slice(0, 4).map((item, index) => (
            <IconButton
              key={item.path}
              variant={getBottomNavValue() === index ? 'soft' : 'plain'}
              color={getBottomNavValue() === index ? 'primary' : 'neutral'}
              onClick={() => handleNavigate(item.path)}
              sx={{
                flexDirection: 'column',
                gap: 0.5,
                borderRadius: 'lg',
                px: 2,
                py: 1,
              }}
            >
              {item.icon}
              <Typography level="body-xs">{item.label}</Typography>
            </IconButton>
          ))}
        </Sheet>
      )}
    </Box>
  );
}
