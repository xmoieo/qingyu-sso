'use client';
/**
 * 注册页面
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import FormHelperText from '@mui/joy/FormHelperText';
import Avatar from '@mui/joy/Avatar';
import Stack from '@mui/joy/Stack';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('密码长度不能少于6位');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          nickname: formData.nickname || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('注册成功，即将跳转到登录页面...');
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      } else {
        setError(result.error || '注册失败');
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

      {/* 右侧注册表单 */}
      <Box
        sx={{
          flex: { xs: 1, md: '0 0 480px' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          overflow: 'auto',
        }}
      >
        <Card variant="outlined" sx={{ width: '100%', maxWidth: 400, p: 4, my: 2 }}>
          <Stack spacing={3} alignItems="center" sx={{ mb: 3 }}>
            <Avatar sx={{ bgcolor: 'primary.500', width: 56, height: 56 }}>
              <PersonAddIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box sx={{ textAlign: 'center' }}>
              <Typography level="h3">注册</Typography>
              <Typography level="body-sm" sx={{ color: 'text.secondary', mt: 1 }}>
                创建您的账户
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

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>用户名</FormLabel>
                <Input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  autoComplete="username"
                  autoFocus
                />
                <FormHelperText>3-20位字母、数字或下划线</FormHelperText>
              </FormControl>

              <FormControl required>
                <FormLabel>邮箱</FormLabel>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </FormControl>

              <FormControl>
                <FormLabel>昵称</FormLabel>
                <Input
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  autoComplete="name"
                />
              </FormControl>

              <FormControl required>
                <FormLabel>密码</FormLabel>
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  endDecorator={
                    <IconButton
                      variant="plain"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  }
                />
                <FormHelperText>至少6位字符</FormHelperText>
              </FormControl>

              <FormControl required>
                <FormLabel>确认密码</FormLabel>
                <Input
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </FormControl>

              <Button
                type="submit"
                fullWidth
                loading={loading}
                loadingIndicator={<CircularProgress size="sm" />}
                sx={{ mt: 2 }}
              >
                注册
              </Button>

              <Typography level="body-sm" sx={{ textAlign: 'center', color: 'text.secondary' }}>
                已有账户？{' '}
                <Link href="/login" style={{ color: 'var(--joy-palette-primary-500)', fontWeight: 500, textDecoration: 'none' }}>
                  立即登录
                </Link>
              </Typography>
            </Stack>
          </form>
        </Card>
      </Box>
    </Box>
  );
}
