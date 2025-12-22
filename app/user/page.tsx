'use client';
/**
 * 个人信息页面
 */
import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { DashboardLayout } from '@/components/layout';
import { UserRole } from '@/lib/db';

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

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    setPasswordError('');
    setPasswordSuccess('');
  };

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
        <Typography variant="h4" gutterBottom fontWeight="medium">
          个人信息
        </Typography>

        <Grid container spacing={3}>
          {/* 用户信息卡片 */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Avatar
                  src={user?.avatar}
                  sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main', fontSize: 32 }}
                >
                  {user?.nickname?.[0] || user?.username?.[0] || '?'}
                </Avatar>
                <Typography variant="h6">{user?.nickname || user?.username}</Typography>
                <Typography variant="body2" color="text.secondary">
                  @{user?.username}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: 'inline-block',
                    mt: 1,
                    px: 1.5,
                    py: 0.5,
                    bgcolor: 'primary.main',
                    color: 'white',
                    borderRadius: 1,
                  }}
                >
                  {user && getRoleLabel(user.role)}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  注册时间
                </Typography>
                <Typography variant="body2">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '-'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* 编辑表单 */}
          <Grid size={{ xs: 12, md: 8 }}>
            {/* 基本信息 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  基本信息
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                {success && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                  </Alert>
                )}

                <Box component="form" onSubmit={handleProfileSubmit}>
                  <TextField
                    fullWidth
                    label="用户名"
                    value={user?.username || ''}
                    margin="normal"
                    disabled
                    helperText="用户名不可修改"
                  />
                  <TextField
                    fullWidth
                    label="昵称"
                    name="nickname"
                    value={profileData.nickname}
                    onChange={handleProfileChange}
                    margin="normal"
                  />
                  <TextField
                    fullWidth
                    label="邮箱"
                    name="email"
                    type="email"
                    value={profileData.email}
                    onChange={handleProfileChange}
                    margin="normal"
                    required
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={saving}
                    sx={{ mt: 2 }}
                  >
                    {saving ? <CircularProgress size={24} /> : '保存修改'}
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* 修改密码 */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  修改密码
                </Typography>

                {passwordError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {passwordError}
                  </Alert>
                )}

                {passwordSuccess && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {passwordSuccess}
                  </Alert>
                )}

                <Box component="form" onSubmit={handlePasswordSubmit}>
                  <TextField
                    fullWidth
                    label="当前密码"
                    name="currentPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    margin="normal"
                    required
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    label="新密码"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    margin="normal"
                    required
                    helperText="至少6位字符"
                  />
                  <TextField
                    fullWidth
                    label="确认新密码"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    margin="normal"
                    required
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    color="warning"
                    disabled={passwordSaving}
                    sx={{ mt: 2 }}
                  >
                    {passwordSaving ? <CircularProgress size={24} /> : '修改密码'}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
}
