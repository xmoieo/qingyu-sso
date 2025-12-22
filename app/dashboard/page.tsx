'use client';
/**
 * 仪表盘页面
 */
import { useEffect, useState } from 'react';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Typography from '@mui/joy/Typography';
import Grid from '@mui/joy/Grid';
import PeopleIcon from '@mui/icons-material/People';
import AppsIcon from '@mui/icons-material/Apps';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import SecurityIcon from '@mui/icons-material/Security';
import { DashboardLayout } from '@/components/layout';
import { UserRole } from '@/lib/types';

interface User {
  id: string;
  username: string;
  email: string;
  nickname?: string;
  role: UserRole;
}

interface StatsData {
  totalUsers: number;
  totalApplications: number;
  totalAuthorizations: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    totalApplications: 0,
    totalAuthorizations: 0,
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const result = await response.json();
        if (result.success) {
          setUser(result.data);
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
      }
    };

    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
        const result = await response.json();
        if (result.success) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('获取统计数据失败:', error);
      }
    };

    fetchUser();
    fetchStats();
  }, []);

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return '管理员';
      case UserRole.DEVELOPER:
        return '开发者';
      case UserRole.USER:
        return '普通用户';
      default:
        return '未知';
    }
  };

  const statCards = [
    {
      title: '用户总数',
      value: stats.totalUsers,
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      color: 'primary.500',
      roles: [UserRole.ADMIN],
    },
    {
      title: '应用总数',
      value: stats.totalApplications,
      icon: <AppsIcon sx={{ fontSize: 40 }} />,
      color: 'success.500',
      roles: [UserRole.ADMIN, UserRole.DEVELOPER],
    },
    {
      title: '授权次数',
      value: stats.totalAuthorizations,
      icon: <VpnKeyIcon sx={{ fontSize: 40 }} />,
      color: 'warning.500',
      roles: [UserRole.ADMIN, UserRole.DEVELOPER],
    },
  ];

  const visibleCards = statCards.filter(
    (card) => user && card.roles.includes(user.role)
  );

  return (
    <DashboardLayout>
      <Box paddingBottom={10}>
        <Typography level="h2" sx={{ mb: 1 }}>
          仪表盘
        </Typography>
        <Typography level="body-md" sx={{ color: 'text.secondary', mb: 3 }}>
          欢迎回来，{user?.nickname || user?.username}！您当前的角色是{user && getRoleLabel(user.role)}。
        </Typography>

        {/* 统计卡片 */}
        {visibleCards.length > 0 && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {visibleCards.map((card) => (
              <Grid xs={12} sm={6} md={4} key={card.title}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                          {card.title}
                        </Typography>
                        <Typography level="h2">
                          {card.value}
                        </Typography>
                      </Box>
                      <Box sx={{ color: card.color }}>
                        {card.icon}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* 普通用户欢迎信息 */}
        {user?.role === UserRole.USER && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SecurityIcon sx={{ fontSize: 48, color: 'primary.500' }} />
                <Box>
                  <Typography level="title-lg">安全提示</Typography>
                  <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                    您可以在“个人信息”页面管理您的账户信息和密码。
                    当第三方应用请求访问您的账户时，请仔细核实应用信息后再授权。
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* 快速入门 */}
        <Card variant="outlined">
          <CardContent>
            <Typography level="title-lg" sx={{ mb: 2 }}>
              快速入门
            </Typography>
            <Typography level="body-sm" sx={{ color: 'text.secondary', mb: 1 }}>
              统一身份认证平台是一个兼容OAuth 2.0和OpenID Connect (OIDC)协议的企业级单点登录解决方案。
            </Typography>
            {user?.role === UserRole.ADMIN && (
              <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                作为管理员，您可以管理所有用户、创建开发者账户、查看和管理所有接入的应用程序。
              </Typography>
            )}
            {user?.role === UserRole.DEVELOPER && (
              <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                作为开发者，您可以创建和管理自己的应用程序，获取OAuth客户端凭证，实现第三方登录集成。
              </Typography>
            )}
            {user?.role === UserRole.USER && (
              <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                作为普通用户，您可以使用此账户登录已接入的第三方应用程序，无需在每个应用单独注册。
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </DashboardLayout>
  );
}
