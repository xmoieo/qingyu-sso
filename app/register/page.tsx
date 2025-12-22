'use client';
/**
 * 注册页面
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Input from '@mui/joy/Input';
import Button from '@mui/joy/Button';
import Typography from '@mui/joy/Typography';
import Alert from '@mui/joy/Alert';
import IconButton from '@mui/joy/IconButton';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import FormHelperText from '@mui/joy/FormHelperText';
import Stack from '@mui/joy/Stack';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
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
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.surface',
        p: 2,
      }}
    >
      <Card variant="outlined" sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack alignItems="center" spacing={1} sx={{ mb: 4 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'primary.softBg',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PersonAddIcon sx={{ color: 'primary.500' }} />
            </Box>
            <Typography level="h3">统一认证平台</Typography>
            <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
              创建您的账户
            </Typography>
          </Stack>

          {error && (
            <Alert color="danger" variant="soft" startDecorator={<WarningIcon />} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert color="success" variant="soft" startDecorator={<CheckCircleIcon />} sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>用户名</FormLabel>
                <Input
                  name="username"
                  startDecorator={<PersonIcon />}
                  placeholder="请输入用户名"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="username"
                />
                <FormHelperText>3-20位字母、数字或下划线</FormHelperText>
              </FormControl>

              <FormControl required>
                <FormLabel>邮箱</FormLabel>
                <Input
                  name="email"
                  type="email"
                  startDecorator={<EmailIcon />}
                  placeholder="请输入邮箱"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="email"
                />
              </FormControl>

              <FormControl required>
                <FormLabel>密码</FormLabel>
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  startDecorator={<LockIcon />}
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="new-password"
                  endDecorator={
                    <IconButton
                      variant="plain"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
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
                  startDecorator={<LockIcon />}
                  placeholder="请再次输入密码"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="new-password"
                />
              </FormControl>

              <Button type="submit" fullWidth loading={loading}>
                注册
              </Button>
            </Stack>
          </form>

          <Typography
            level="body-sm"
            sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}
          >
            已有账户？{' '}
            <Link href="/login" style={{ color: 'inherit' }}>
              <Typography sx={{ color: 'primary.500', cursor: 'pointer' }}>
                立即登录
              </Typography>
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
