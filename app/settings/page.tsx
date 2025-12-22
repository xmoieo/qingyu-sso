'use client';
/**
 * 系统设置页面（管理员）
 */
import { useEffect, useState } from 'react';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import Button from '@mui/joy/Button';
import Typography from '@mui/joy/Typography';
import Alert from '@mui/joy/Alert';
import CircularProgress from '@mui/joy/CircularProgress';
import Input from '@mui/joy/Input';
import Textarea from '@mui/joy/Textarea';
import Switch from '@mui/joy/Switch';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import FormHelperText from '@mui/joy/FormHelperText';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import Stack from '@mui/joy/Stack';
import Divider from '@mui/joy/Divider';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import { DashboardLayout } from '@/components/layout';

interface SystemSettings {
  allowRegistration: boolean;
  avatarProvider: 'gravatar' | 'cravatar';
  logoUrl: string;
  copyrightHtml: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const result = await response.json();
      if (result.success) {
        setSettings(result.data);
      } else {
        setError(result.error || '获取设置失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('设置已保存');
        setSettings(result.data);
      } else {
        setError(result.error || '保存失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setSaving(false);
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
      <Box paddingBottom={10}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <SettingsIcon />
          <Typography level="h2">系统设置</Typography>
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

        <Card variant="outlined" sx={{ maxWidth: 600 }}>
          <CardContent>
            <Typography level="title-lg" sx={{ mb: 2 }}>用户注册</Typography>
            
            <FormControl orientation="horizontal" sx={{ justifyContent: 'space-between' }}>
              <Box>
                <FormLabel>开放用户注册</FormLabel>
                <FormHelperText>关闭后，新用户将无法自行注册账户</FormHelperText>
              </Box>
              <Switch
                checked={settings?.allowRegistration ?? true}
                onChange={(e) => setSettings(prev => prev ? { ...prev, allowRegistration: e.target.checked } : null)}
              />
            </FormControl>

            <Divider sx={{ my: 3 }} />

            <Typography level="title-lg" sx={{ mb: 2 }}>头像设置</Typography>

            <FormControl>
              <FormLabel>头像服务提供商</FormLabel>
              <Select
                value={settings?.avatarProvider || 'gravatar'}
                onChange={(_, value) => setSettings(prev => prev ? { ...prev, avatarProvider: value as 'gravatar' | 'cravatar' } : null)}
              >
                <Option value="gravatar">Gravatar (国际)</Option>
                <Option value="cravatar">Cravatar (国内加速)</Option>
              </Select>
              <FormHelperText>
                Cravatar 是 Gravatar 的国内镜像，访问速度更快
              </FormHelperText>
            </FormControl>

            <Box sx={{ mt: 3 }}>
              <Button onClick={handleSave} loading={saving}>
                保存设置
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography level="title-lg" sx={{ mb: 2 }}>品牌展示</Typography>

            <FormControl sx={{ mb: 2 }}>
              <FormLabel>Logo URL</FormLabel>
              <Input
                value={settings?.logoUrl ?? ''}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev ? { ...prev, logoUrl: e.target.value } : null
                  )
                }
                placeholder="https://example.com/logo.png"
              />
              <FormHelperText>登录/注册页面顶部显示（留空则使用默认图标）</FormHelperText>
            </FormControl>

            <FormControl>
              <FormLabel>版权信息（支持 HTML）</FormLabel>
              <Textarea
                minRows={3}
                value={settings?.copyrightHtml ?? ''}
                onChange={(e) =>
                  setSettings((prev) =>
                    prev ? { ...prev, copyrightHtml: e.target.value } : null
                  )
                }
                placeholder="例如：© 2025 <a href='https://example.com'>Your Company</a>"
              />
              <FormHelperText>将显示在登录/注册页面底部</FormHelperText>
            </FormControl>
          </CardContent>
        </Card>
      </Box>
    </DashboardLayout>
  );
}
