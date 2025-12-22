'use client';
/**
 * 个人信息页面
 */
import { useEffect, useState } from 'react';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Input from '@mui/joy/Input';
import Button from '@mui/joy/Button';
import Typography from '@mui/joy/Typography';
import Alert from '@mui/joy/Alert';
import CircularProgress from '@mui/joy/CircularProgress';
import Divider from '@mui/joy/Divider';
import Avatar from '@mui/joy/Avatar';
import Grid from '@mui/joy/Grid';
import IconButton from '@mui/joy/IconButton';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import FormHelperText from '@mui/joy/FormHelperText';
import Stack from '@mui/joy/Stack';
import Chip from '@mui/joy/Chip';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { DashboardLayout } from '@/components/layout';
import { UserRole } from '@/lib/types';

interface User {
  id: string;
  username: string;
  email: string;
  nickname?: string;
  avatar?: string;
  role: UserRole;
  createdAt: string;
}

export default function UserProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 个人信息表单
  const [profileData, setProfileData] = useState({
    nickname: '',
    email: '',
  });

  // 密码修改表单
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        const result = await response.json();
        if (result.success) {
          setUser(result.data);
          setProfileData({
            nickname: result.data.nickname || '',
            email: result.data.email,
          });
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('个人信息更新成功');
        setUser(result.data);
      } else {
        setError(result.error || '更新失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      setPasswordSaving(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('新密码长度不能少于6位');
      setPasswordSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPasswordSuccess('密码修改成功');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        setPasswordError(result.error || '密码修改失败');
      }
    } catch {
      setPasswordError('网络错误，请稍后重试');
    } finally {
      setPasswordSaving(false);
    }
  };

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

  const getRoleColor = (role: UserRole): 'danger' | 'warning' | 'neutral' => {
    switch (role) {
      case UserRole.ADMIN:
        return 'danger';
      case UserRole.DEVELOPER:
        return 'warning';
      default:
        return 'neutral';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Box>
        <Typography level="h2" sx={{ mb: 3 }}>
          个人信息
        </Typography>

        <Grid container spacing={3}>
          {/* 用户信息卡片 */}
          <Grid xs={12} md={4}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Avatar
                  src={user?.avatar}
                  sx={{ width: 80, height: 80, mx: 'auto', mb: 2, fontSize: 32 }}
                >
                  {user?.nickname?.[0] || user?.username?.[0] || '?'}
                </Avatar>
                <Typography level="title-lg">{user?.nickname || user?.username}</Typography>
                <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                  @{user?.username}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip
                    size="sm"
                    variant="soft"
                    color={user ? getRoleColor(user.role) : 'neutral'}
                  >
                    {user && getRoleLabel(user.role)}
                  </Chip>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                  注册时间
                </Typography>
                <Typography level="body-sm">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '-'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* 编辑表单 */}
          <Grid xs={12} md={8}>
            {/* 基本信息 */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Typography level="title-lg" sx={{ mb: 2 }}>
                  基本信息
                </Typography>

                {error && (
                  <Alert
                    color="danger"
                    variant="soft"
                    startDecorator={<WarningIcon />}
                    sx={{ mb: 2 }}
                  >
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert
                    color="success"
                    variant="soft"
                    startDecorator={<CheckCircleIcon />}
                    sx={{ mb: 2 }}
                  >
                    {success}
                  </Alert>
                )}

                <form onSubmit={handleProfileSubmit}>
                  <Stack spacing={2}>
                    <FormControl>
                      <FormLabel>用户名</FormLabel>
                      <Input value={user?.username || ''} disabled />
                      <FormHelperText>用户名不可修改</FormHelperText>
                    </FormControl>

                    <FormControl>
                      <FormLabel>昵称</FormLabel>
                      <Input
                        value={profileData.nickname}
                        onChange={(e) => setProfileData((prev) => ({ ...prev, nickname: e.target.value }))}
                      />
                    </FormControl>

                    <FormControl required>
                      <FormLabel>邮箱</FormLabel>
                      <Input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </FormControl>

                    <Button type="submit" loading={saving}>
                      保存修改
                    </Button>
                  </Stack>
                </form>
              </CardContent>
            </Card>

            {/* 修改密码 */}
            <Card variant="outlined">
              <CardContent>
                <Typography level="title-lg" sx={{ mb: 2 }}>
                  修改密码
                </Typography>

                {passwordError && (
                  <Alert
                    color="danger"
                    variant="soft"
                    startDecorator={<WarningIcon />}
                    sx={{ mb: 2 }}
                  >
                    {passwordError}
                  </Alert>
                )}

                {passwordSuccess && (
                  <Alert
                    color="success"
                    variant="soft"
                    startDecorator={<CheckCircleIcon />}
                    sx={{ mb: 2 }}
                  >
                    {passwordSuccess}
                  </Alert>
                )}

                <form onSubmit={handlePasswordSubmit}>
                  <Stack spacing={2}>
                    <FormControl required>
                      <FormLabel>当前密码</FormLabel>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                        endDecorator={
                          <IconButton variant="plain" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        }
                      />
                    </FormControl>

                    <FormControl required>
                      <FormLabel>新密码</FormLabel>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                      />
                      <FormHelperText>至少6位字符</FormHelperText>
                    </FormControl>

                    <FormControl required>
                      <FormLabel>确认新密码</FormLabel>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      />
                    </FormControl>

                    <Button type="submit" color="warning" loading={passwordSaving}>
                      修改密码
                    </Button>
                  </Stack>
                </form>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
}
