'use client';
/**
 * 注册页面
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import Avatar from '@mui/material/Avatar';

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

    // 前端验证
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
        bgcolor: 'background.default',
      }}
    >
      {/* 左侧图片区域 - 仅桌面端显示 */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flex: 1,
          bgcolor: 'primary.main',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: 'white',
          p: 4,
        }}
      >
        <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
          统一身份认证平台
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9, textAlign: 'center', maxWidth: 400 }}>
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
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 400, boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, mb: 2 }}>
                <PersonAddOutlinedIcon fontSize="large" />
              </Avatar>
              <Typography component="h1" variant="h5" fontWeight="medium">
                注册
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                创建您的账户
              </Typography>
            </Box>

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

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="用户名"
                name="username"
                value={formData.username}
                onChange={handleChange}
                margin="normal"
                required
                autoComplete="username"
                autoFocus
                helperText="3-20位字母、数字或下划线"
              />
              <TextField
                fullWidth
                label="邮箱"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                margin="normal"
                required
                autoComplete="email"
              />
              <TextField
                fullWidth
                label="昵称"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                margin="normal"
                autoComplete="name"
              />
              <TextField
                fullWidth
                label="密码"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                margin="normal"
                required
                autoComplete="new-password"
                helperText="至少6位字符"
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
                label="确认密码"
                name="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                margin="normal"
                required
                autoComplete="new-password"
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mt: 3, mb: 2, py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : '注册'}
              </Button>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  已有账户？{' '}
                  <Link href="/login" style={{ color: '#1976d2', fontWeight: 500 }}>
                    立即登录
                  </Link>
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
