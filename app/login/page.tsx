'use client';
/**
 * 登录页面
 */
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import Input from '@mui/joy/Input';
import Button from '@mui/joy/Button';
import Typography from '@mui/joy/Typography';
import Alert from '@mui/joy/Alert';
import CircularProgress from '@mui/joy/CircularProgress';
import IconButton from '@mui/joy/IconButton';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Avatar from '@mui/joy/Avatar';
import Stack from '@mui/joy/Stack';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import WarningIcon from '@mui/icons-material/Warning';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(result.error || '登录失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: 'background.surface',
      }}
    >
      {/* 左侧图片区域 - 仅桌面端显示 */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: 1,
          bgcolor: 'primary.500',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: 'white',
          p: 4,
        }}
      >
        <Typography level="h1" sx={{ color: 'white', fontWeight: 'bold', mb: 2 }}>
          统一身份认证平台
        </Typography>
        <Typography level="body-lg" sx={{ color: 'white', opacity: 0.9, textAlign: 'center', maxWidth: 400 }}>
          安全、便捷的企业级单点登录解决方案
        </Typography>
      </Box>

      {/* 右侧登录表单 */}
      <Box
        sx={{
          flex: { xs: 1, md: '0 0 480px' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Card variant="outlined" sx={{ width: '100%', maxWidth: 400, p: 4 }}>
          <Stack spacing={3} alignItems="center" sx={{ mb: 3 }}>
            <Avatar sx={{ bgcolor: 'primary.500', width: 56, height: 56 }}>
              <LockIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box sx={{ textAlign: 'center' }}>
              <Typography level="h3">登录</Typography>
              <Typography level="body-sm" sx={{ color: 'text.secondary', mt: 1 }}>
                欢迎回来，请登录您的账户
              </Typography>
            </Box>
          </Stack>

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

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>用户名 / 邮箱</FormLabel>
                <Input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  autoComplete="username"
                  autoFocus
                />
              </FormControl>

              <FormControl required>
                <FormLabel>密码</FormLabel>
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  endDecorator={
                    <IconButton
                      variant="plain"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  }
                />
              </FormControl>

              <Button
                type="submit"
                fullWidth
                loading={loading}
                loadingIndicator={<CircularProgress size="sm" />}
                sx={{ mt: 2 }}
              >
                登录
              </Button>

              <Typography level="body-sm" sx={{ textAlign: 'center', color: 'text.secondary' }}>
                还没有账户？{' '}
                <Link href="/register" style={{ color: 'var(--joy-palette-primary-500)', fontWeight: 500, textDecoration: 'none' }}>
                  立即注册
                </Link>
              </Typography>
            </Stack>
          </form>
        </Card>
      </Box>
    </Box>
  );
}
