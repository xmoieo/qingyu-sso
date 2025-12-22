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
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import Table from '@mui/joy/Table';
import Sheet from '@mui/joy/Sheet';
import Tabs from '@mui/joy/Tabs';
import TabList from '@mui/joy/TabList';
import Tab from '@mui/joy/Tab';
import TabPanel from '@mui/joy/TabPanel';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import { DashboardLayout } from '@/components/layout';
import { UserRole } from '@/lib/types';

interface User {
  id: string;
  username: string;
  email: string;
  nickname?: string;
  avatar?: string;
  gender?: string;
  birthday?: string;
  role: UserRole;
  createdAt: string;
}

interface ConsentedApp {
  clientId: string;
  appName: string;
  appDescription: string | null;
  scope: string;
  createdAt: string;
  ownerUsername: string;
}

interface AuthLog {
  id: string;
  clientId: string;
  action: string;
  ipAddress: string | null;
  createdAt: string;
  applicationName: string;
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
    gender: '',
    birthday: '',
  });

  // 密码修改
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // 已授权应用
  const [consents, setConsents] = useState<ConsentedApp[]>([]);
  const [consentsLoading, setConsentsLoading] = useState(false);

  // 授权日志
  const [authLogs, setAuthLogs] = useState<AuthLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

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
            gender: result.data.gender || '',
            birthday: result.data.birthday || '',
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

  const fetchConsents = async () => {
    setConsentsLoading(true);
    try {
      const response = await fetch('/api/user/consents');
      const result = await response.json();
      if (result.success) {
        setConsents(result.data);
      }
    } catch (error) {
      console.error('获取已授权应用失败:', error);
    } finally {
      setConsentsLoading(false);
    }
  };

  const fetchAuthLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await fetch('/api/auth-logs');
      const result = await response.json();
      if (result.success) {
        setAuthLogs(result.data.logs);
      }
    } catch (error) {
      console.error('获取授权日志失败:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleRevokeConsent = async (clientId: string) => {
    if (!confirm('确定要撤销此应用的授权吗？撤销后该应用将无法访问您的数据。')) {
      return;
    }

    try {
      const response = await fetch('/api/user/consents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });

      const result = await response.json();
      if (result.success) {
        setConsents(consents.filter(c => c.clientId !== clientId));
      }
    } catch (error) {
      console.error('撤销授权失败:', error);
    }
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
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
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
      case UserRole.ADMIN: return '管理员';
      case UserRole.DEVELOPER: return '开发者';
      case UserRole.USER: return '普通用户';
      default: return '未知';
    }
  };

  const getRoleColor = (role: UserRole): 'danger' | 'warning' | 'neutral' => {
    switch (role) {
      case UserRole.ADMIN: return 'danger';
      case UserRole.DEVELOPER: return 'warning';
      default: return 'neutral';
    }
  };

  const normalizeScopes = (scope: string) => {
    const parts = scope
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const seen = new Set<string>();
    const unique: string[] = [];
    for (const s of parts) {
      if (!seen.has(s)) {
        seen.add(s);
        unique.push(s);
      }
    }
    return unique;
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'consent': return '授权登录';
      case 'token': return '令牌刷新';
      case 'revoke': return '撤销授权';
      default: return action;
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
        <Typography level="h2" sx={{ mb: 3 }}>个人中心</Typography>

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
                  <Chip size="sm" variant="soft" color={user ? getRoleColor(user.role) : 'neutral'}>
                    {user && getRoleLabel(user.role)}
                  </Chip>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>注册时间</Typography>
                <Typography level="body-sm">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '-'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* 主内容区 */}
          <Grid xs={12} md={8}>
            <Tabs defaultValue={0} onChange={(_, value) => {
              if (value === 1) fetchConsents();
              if (value === 2) fetchAuthLogs();
            }}>
              <TabList>
                <Tab>基本信息</Tab>
                <Tab>已授权应用</Tab>
                <Tab>授权日志</Tab>
                <Tab>修改密码</Tab>
              </TabList>

              {/* 基本信息 */}
              <TabPanel value={0}>
                <Card variant="outlined">
                  <CardContent>
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

                    <form onSubmit={handleProfileSubmit}>
                      <Grid container spacing={2}>
                        <Grid xs={12} sm={6}>
                          <FormControl>
                            <FormLabel>用户名</FormLabel>
                            <Input value={user?.username || ''} disabled />
                            <FormHelperText>用户名不可修改</FormHelperText>
                          </FormControl>
                        </Grid>
                        <Grid xs={12} sm={6}>
                          <FormControl>
                            <FormLabel>昵称</FormLabel>
                            <Input
                              value={profileData.nickname}
                              onChange={(e) => setProfileData(prev => ({ ...prev, nickname: e.target.value }))}
                            />
                          </FormControl>
                        </Grid>
                        <Grid xs={12} sm={6}>
                          <FormControl required>
                            <FormLabel>邮箱</FormLabel>
                            <Input
                              type="email"
                              value={profileData.email}
                              onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                            />
                          </FormControl>
                        </Grid>
                        <Grid xs={12} sm={6}>
                          <FormControl>
                            <FormLabel>性别</FormLabel>
                            <Select
                              value={profileData.gender}
                              onChange={(_, value) => setProfileData(prev => ({ ...prev, gender: value || '' }))}
                              placeholder="请选择"
                            >
                              <Option value="">不设置</Option>
                              <Option value="男">男</Option>
                              <Option value="女">女</Option>
                              <Option value="其他">其他</Option>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid xs={12} sm={6}>
                          <FormControl>
                            <FormLabel>生日</FormLabel>
                            <Input
                              type="date"
                              value={profileData.birthday}
                              onChange={(e) => setProfileData(prev => ({ ...prev, birthday: e.target.value }))}
                            />
                          </FormControl>
                        </Grid>
                        <Grid xs={12}>
                          <Button type="submit" loading={saving}>保存修改</Button>
                        </Grid>
                      </Grid>
                    </form>
                  </CardContent>
                </Card>
              </TabPanel>

              {/* 已授权应用 */}
              <TabPanel value={1}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography level="title-md" sx={{ mb: 2 }}>
                      以下应用已获得您的授权，可以访问您的账户信息
                    </Typography>
                    {consentsLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : consents.length === 0 ? (
                      <Typography level="body-sm" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                        暂无已授权的应用
                      </Typography>
                    ) : (
                      <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto' }}>
                        <Table>
                          <thead>
                            <tr>
                              <th>应用名称</th>
                              <th>授权范围</th>
                              <th>授权时间</th>
                              <th style={{ width: 80 }}>操作</th>
                            </tr>
                          </thead>
                          <tbody>
                            {consents.map((consent) => (
                              <tr key={consent.clientId}>
                                <td>
                                  <Typography level="body-sm" fontWeight="md">{consent.appName}</Typography>
                                  <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                                    来自 @{consent.ownerUsername}
                                  </Typography>
                                </td>
                                <td>
                                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                    {normalizeScopes(consent.scope).map((s) => (
                                      <Chip key={s} size="sm" variant="soft">
                                        {s}
                                      </Chip>
                                    ))}
                                  </Stack>
                                </td>
                                <td>{new Date(consent.createdAt).toLocaleString('zh-CN')}</td>
                                <td>
                                  <IconButton
                                    size="sm"
                                    color="danger"
                                    onClick={() => handleRevokeConsent(consent.clientId)}
                                  >
                                    <DeleteIcon />
                                  </IconButton>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </Sheet>
                    )}
                  </CardContent>
                </Card>
              </TabPanel>

              {/* 授权日志 */}
              <TabPanel value={2}>
                <Card variant="outlined">
                  <CardContent>
                    {logsLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : authLogs.length === 0 ? (
                      <Typography level="body-sm" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                        暂无授权日志
                      </Typography>
                    ) : (
                      <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto' }}>
                        <Table>
                          <thead>
                            <tr>
                              <th>应用</th>
                              <th>操作</th>
                              <th>IP地址</th>
                              <th>时间</th>
                            </tr>
                          </thead>
                          <tbody>
                            {authLogs.map((log) => (
                              <tr key={log.id}>
                                <td>{log.applicationName || log.clientId}</td>
                                <td>
                                  <Chip size="sm" variant="soft" color="primary">
                                    {getActionLabel(log.action)}
                                  </Chip>
                                </td>
                                <td><code>{log.ipAddress || '未知'}</code></td>
                                <td>{new Date(log.createdAt).toLocaleString('zh-CN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </Sheet>
                    )}
                  </CardContent>
                </Card>
              </TabPanel>

              {/* 修改密码 */}
              <TabPanel value={3}>
                <Card variant="outlined">
                  <CardContent>
                    {passwordError && (
                      <Alert color="danger" variant="soft" startDecorator={<WarningIcon />} sx={{ mb: 2 }}>
                        {passwordError}
                      </Alert>
                    )}
                    {passwordSuccess && (
                      <Alert color="success" variant="soft" startDecorator={<CheckCircleIcon />} sx={{ mb: 2 }}>
                        {passwordSuccess}
                      </Alert>
                    )}

                    <form onSubmit={handlePasswordSubmit}>
                      <Stack spacing={2} sx={{ maxWidth: 400 }}>
                        <FormControl required>
                          <FormLabel>当前密码</FormLabel>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
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
                            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          />
                          <FormHelperText>至少6位字符</FormHelperText>
                        </FormControl>
                        <FormControl required>
                          <FormLabel>确认新密码</FormLabel>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          />
                        </FormControl>
                        <Button type="submit" color="warning" loading={passwordSaving}>
                          修改密码
                        </Button>
                      </Stack>
                    </form>
                  </CardContent>
                </Card>
              </TabPanel>
            </Tabs>
          </Grid>
        </Grid>
      </Box>
    </DashboardLayout>
  );
}
