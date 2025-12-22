'use client';
/**
 * OAuth授权同意页面
 */
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import CheckIcon from '@mui/icons-material/Check';
import AppsIcon from '@mui/icons-material/Apps';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import RefreshIcon from '@mui/icons-material/Refresh';
import LockIcon from '@mui/icons-material/Lock';

interface Application {
  id: string;
  name: string;
  description?: string;
}

interface ScopeInfo {
  scope: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const scopeInfoMap: Record<string, Omit<ScopeInfo, 'scope'>> = {
  openid: {
    label: '基本身份',
    description: '允许应用验证您的身份',
    icon: <LockIcon />,
  },
  profile: {
    label: '个人资料',
    description: '访问您的用户名和昵称',
    icon: <PersonIcon />,
  },
  email: {
    label: '邮箱地址',
    description: '访问您的邮箱地址',
    icon: <EmailIcon />,
  },
  offline_access: {
    label: '离线访问',
    description: '允许应用在您不在线时访问您的数据',
    icon: <RefreshIcon />,
  },
};

export default function AuthorizePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 获取URL参数
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const scope = searchParams.get('scope') || 'openid';
  const state = searchParams.get('state');
  const nonce = searchParams.get('nonce');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');

  useEffect(() => {
    const fetchApplication = async () => {
      if (!clientId) {
        setError('缺少client_id参数');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/oauth/client-info?client_id=${clientId}`);
        const result = await response.json();

        if (result.success) {
          setApplication(result.data);
        } else {
          setError(result.error || '应用不存在');
        }
      } catch {
        setError('获取应用信息失败');
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [clientId]);

  const handleAuthorize = async (approve: boolean) => {
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/oauth/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          redirectUri,
          scope,
          state,
          nonce,
          codeChallenge,
          codeChallengeMethod,
          approve,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 重定向到回调URL
        window.location.href = result.data.redirectUrl;
      } else {
        setError(result.error || '授权失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 解析scope列表
  const scopes = scope.split(' ').map((s) => ({
    scope: s,
    ...(scopeInfoMap[s] || {
      label: s,
      description: `授权 ${s} 权限`,
      icon: <CheckIcon />,
    }),
  }));

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error && !application) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 3,
        }}
      >
        <Card sx={{ maxWidth: 400, width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Alert severity="error">{error}</Alert>
            <Button
              variant="outlined"
              onClick={() => router.push('/dashboard')}
              sx={{ mt: 3 }}
            >
              返回首页
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      <Card sx={{ maxWidth: 450, width: '100%', boxShadow: 3 }}>
        <CardContent sx={{ p: 4 }}>
          {/* 头部 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 64, height: 64, mb: 2 }}>
              <AppsIcon fontSize="large" />
            </Avatar>
            <Typography variant="h5" fontWeight="medium" gutterBottom>
              授权请求
            </Typography>
            <Typography variant="body1" fontWeight="medium" color="primary.main">
              {application?.name}
            </Typography>
            {application?.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                {application.description}
              </Typography>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* 权限列表 */}
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            该应用请求获取以下权限：
          </Typography>

          <List dense>
            {scopes.map((scopeInfo) => (
              <ListItem key={scopeInfo.scope}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {scopeInfo.icon}
                </ListItemIcon>
                <ListItemText
                  primary={scopeInfo.label}
                  secondary={scopeInfo.description}
                />
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 2 }} />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* 操作按钮 */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              size="large"
              disabled={submitting}
              onClick={() => handleAuthorize(false)}
            >
              拒绝
            </Button>
            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={submitting}
              onClick={() => handleAuthorize(true)}
            >
              {submitting ? <CircularProgress size={24} color="inherit" /> : '同意'}
            </Button>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 2, textAlign: 'center' }}
          >
            授权后，该应用将能够按照所选权限访问您的账户信息
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
