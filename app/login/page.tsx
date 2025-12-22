'use client';
/**
 * 登录页面
 */
import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import Input from '@mui/joy/Input';
import Button from '@mui/joy/Button';
import Typography from '@mui/joy/Typography';
import Alert from '@mui/joy/Alert';
import CircularProgress from '@mui/joy/CircularProgress';
import Stack from '@mui/joy/Stack';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import WarningIcon from '@mui/icons-material/Warning';
import { getMeCache } from '@/lib/hooks';
import parse from 'html-react-parser';

interface PublicSettings {
  logoUrl: string;
  copyrightHtml: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [publicSettings, setPublicSettings] = useState<PublicSettings | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPublicSettings = async () => {
      try {
        const response = await fetch('/api/public/settings');
        const result = await response.json();
        if (result?.success) {
          setPublicSettings(result.data);
        }
      } catch {
        // ignore
      }
    };

    fetchPublicSettings();
  }, []);

  // 检查是否已登录（优先使用缓存，减少不必要请求）
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const cached = getMeCache();
        if (cached) {
          const returnUrl = searchParams.get('returnUrl') || '/dashboard';
          router.replace(returnUrl);
          return;
        }
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const returnUrl = searchParams.get('returnUrl') || '/dashboard';
          router.replace(returnUrl);
        }
      } catch {
        // 未登录，留在登录页
      }
    };
    checkAuth();
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (result.success) {
        const returnUrl = searchParams.get('returnUrl') || '/dashboard';
        router.push(returnUrl);
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
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.surface',
        p: 2,
      }}
    >
      <Card variant="outlined" sx={{ width: '100%', maxWidth: 400 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack alignItems="center" spacing={1} sx={{ mb: 4 }}>
            {publicSettings?.logoUrl ? (
              <Box
                component="img"
                src={publicSettings.logoUrl}
                alt="logo"
                sx={{ width: 48, height: 48, objectFit: 'contain' }}
              />
            ) : (
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
                <LockIcon sx={{ color: 'primary.500' }} />
              </Box>
            )}
            <Typography level="h3">统一认证平台</Typography>
            <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
              请使用您的账户登录
            </Typography>
          </Stack>

          {error && (
            <Alert color="danger" variant="soft" startDecorator={<WarningIcon />} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <FormControl required>
                <FormLabel>用户名</FormLabel>
                <Input
                  startDecorator={<PersonIcon />}
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  autoComplete="username"
                />
              </FormControl>

              <FormControl required>
                <FormLabel>密码</FormLabel>
                <Input
                  type="password"
                  startDecorator={<LockIcon />}
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
              </FormControl>

              <Button type="submit" fullWidth loading={loading}>
                登录
              </Button>
            </Stack>
          </form>

          <Typography
            level="body-sm"
            sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}
          >
            还没有账户？{' '}
            <Link href="/register" style={{ color: 'inherit' }}>
              <Typography sx={{ color: 'primary.500', cursor: 'pointer' }}>
                立即注册
              </Typography>
            </Link>
          </Typography>

          {publicSettings?.copyrightHtml ? (
            <Typography
              level="body-xs"
              sx={{ mt: 2, textAlign: 'center', color: 'text.tertiary' }}
              component="div"
            >
              {parse(publicSettings.copyrightHtml)}
            </Typography>
          ) : null}
        </CardContent>
      </Card>
    </Box>
  );
}

function LoginLoading() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.surface',
      }}
    >
      <CircularProgress />
    </Box>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}
