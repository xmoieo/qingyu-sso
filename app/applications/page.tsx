'use client';
/**
 * 应用管理页面（管理员/开发者）
 */
import { useEffect, useState, useCallback } from 'react';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import CardContent from '@mui/joy/CardContent';
import CardActions from '@mui/joy/CardActions';
import Button from '@mui/joy/Button';
import Typography from '@mui/joy/Typography';
import Alert from '@mui/joy/Alert';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import DialogTitle from '@mui/joy/DialogTitle';
import DialogContent from '@mui/joy/DialogContent';
import DialogActions from '@mui/joy/DialogActions';
import Input from '@mui/joy/Input';
import Textarea from '@mui/joy/Textarea';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import FormHelperText from '@mui/joy/FormHelperText';
import IconButton from '@mui/joy/IconButton';
import Chip from '@mui/joy/Chip';
import CircularProgress from '@mui/joy/CircularProgress';
import Grid from '@mui/joy/Grid';
import Divider from '@mui/joy/Divider';
import Tooltip from '@mui/joy/Tooltip';
import Stack from '@mui/joy/Stack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShareIcon from '@mui/icons-material/Share';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { DashboardLayout } from '@/components/layout';

interface Application {
  id: string;
  clientId: string;
  clientSecret: string;
  name: string;
  description?: string;
  redirectUris: string;
  scopes: string;
  userId: string;
  createdAt: string;
  accessType?: string;
  ownerUsername?: string;
}

interface Permission {
  userId: string;
  username: string;
  permission: string;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogLoading, setDialogLoading] = useState(false);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  // 删除确认对话框
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appToDelete, setAppToDelete] = useState<Application | null>(null);

  // 权限管理对话框
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [permApp, setPermApp] = useState<Application | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permLoading, setPermLoading] = useState(false);
  const [newPermUsername, setNewPermUsername] = useState('');
  const [newPermType, setNewPermType] = useState<'view' | 'edit'>('view');

  // 密钥显示状态
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    redirectUris: '',
    scopes: 'openid profile email',
  });

  const fetchApplications = useCallback(async () => {
    try {
      const response = await fetch('/api/applications');
      const result = await response.json();
      if (result.success) {
        setApplications(result.data.applications);
      } else {
        setError(result.error || '获取应用列表失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleOpenDialog = (mode: 'create' | 'edit', app?: Application) => {
    setDialogMode(mode);
    if (mode === 'edit' && app) {
      setSelectedApp(app);
      setFormData({
        name: app.name,
        description: app.description || '',
        redirectUris: JSON.parse(app.redirectUris).join('\n'),
        scopes: JSON.parse(app.scopes).join(' '),
      });
    } else {
      setSelectedApp(null);
      setFormData({
        name: '',
        description: '',
        redirectUris: '',
        scopes: 'openid profile email',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedApp(null);
  };

  const handleSubmit = async () => {
    setDialogLoading(true);
    setError('');
    setSuccess('');

    const redirectUris = formData.redirectUris
      .split('\n')
      .map((uri) => uri.trim())
      .filter((uri) => uri);

    if (redirectUris.length === 0) {
      setError('至少需要一个重定向URI');
      setDialogLoading(false);
      return;
    }

    const scopes = formData.scopes
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => s);

    try {
      const url = dialogMode === 'create' ? '/api/applications' : `/api/applications/${selectedApp?.id}`;
      const method = dialogMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          redirectUris,
          scopes,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(dialogMode === 'create' ? '应用创建成功' : '应用更新成功');
        handleCloseDialog();
        fetchApplications();
      } else {
        setError(result.error || '操作失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setDialogLoading(false);
    }
  };

  const handleDeleteClick = (app: Application) => {
    setAppToDelete(app);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!appToDelete) return;

    try {
      const response = await fetch(`/api/applications/${appToDelete.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('应用删除成功');
        fetchApplications();
      } else {
        setError(result.error || '删除失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setDeleteDialogOpen(false);
      setAppToDelete(null);
    }
  };

  const handleRegenerateSecret = async (appId: string) => {
    if (!confirm('确定要重新生成客户端密钥吗？旧密钥将立即失效。')) {
      return;
    }

    try {
      const response = await fetch(`/api/applications/${appId}/regenerate-secret`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('客户端密钥已重新生成');
        fetchApplications();
        setVisibleSecrets((prev) => new Set(prev).add(appId));
      } else {
        setError(result.error || '重新生成失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    }
  };

  const toggleSecretVisibility = (appId: string) => {
    setVisibleSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(appId)) {
        next.delete(appId);
      } else {
        next.add(appId);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('已复制到剪贴板');
  };

  const handleOpenPermDialog = async (app: Application) => {
    setPermApp(app);
    setPermDialogOpen(true);
    setPermLoading(true);
    try {
      const response = await fetch(`/api/applications/${app.id}/permissions`);
      const result = await response.json();
      if (result.success) {
        setPermissions(result.data);
      }
    } catch {
      setError('获取权限列表失败');
    } finally {
      setPermLoading(false);
    }
  };

  const handleAddPermission = async () => {
    if (!permApp || !newPermUsername) return;
    try {
      const response = await fetch(`/api/applications/${permApp.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newPermUsername, permissionType: newPermType }),
      });
      const result = await response.json();
      if (result.success) {
        setNewPermUsername('');
        handleOpenPermDialog(permApp);
      } else {
        setError(result.error || '添加权限失败');
      }
    } catch {
      setError('网络错误');
    }
  };

  const handleRemovePermission = async (userId: string) => {
    if (!permApp) return;
    try {
      const response = await fetch(`/api/applications/${permApp.id}/permissions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const result = await response.json();
      if (result.success) {
        setPermissions(permissions.filter(p => p.userId !== userId));
      }
    } catch {
      setError('网络错误');
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography level="h2">应用管理</Typography>
          <Button
            startDecorator={<AddIcon />}
            onClick={() => handleOpenDialog('create')}
          >
            创建应用
          </Button>
        </Box>

        {error && (
          <Alert
            color="danger"
            variant="soft"
            startDecorator={<WarningIcon />}
            sx={{ mb: 2 }}
            endDecorator={
              <IconButton variant="soft" color="danger" onClick={() => setError('')}>
                ×
              </IconButton>
            }
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
            endDecorator={
              <IconButton variant="soft" color="success" onClick={() => setSuccess('')}>
                ×
              </IconButton>
            }
          >
            {success}
          </Alert>
        )}

        {applications.length === 0 ? (
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography sx={{ color: 'text.secondary' }}>
                暂无应用，点击“创建应用”按钮添加您的第一个应用
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={{ xs: 2, md: 3 }} sx={{ width: '100%', m: 0 }}>
            {applications.map((app) => (
              <Grid xs={12} md={6} key={app.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography level="title-lg">{app.name}</Typography>
                        {app.accessType && app.accessType !== 'owner' && (
                          <Chip size="sm" variant="soft" color="neutral" sx={{ mt: 0.5 }}>
                            来自 @{app.ownerUsername}
                          </Chip>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {app.accessType === 'owner' && (
                          <Tooltip title="权限管理">
                            <IconButton size="sm" variant="plain" onClick={() => handleOpenPermDialog(app)}>
                              <ShareIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(app.accessType === 'owner' || app.accessType === 'edit') && (
                          <IconButton size="sm" variant="plain" onClick={() => handleOpenDialog('edit', app)}>
                            <EditIcon />
                          </IconButton>
                        )}
                        {app.accessType === 'owner' && (
                          <IconButton size="sm" variant="plain" color="danger" onClick={() => handleDeleteClick(app)}>
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    </Box>

                    {app.description && (
                      <Typography level="body-sm" sx={{ color: 'text.secondary', mb: 2 }}>
                        {app.description}
                      </Typography>
                    )}

                    <Divider sx={{ my: 2 }} />

                    {/* Client ID */}
                    <Box sx={{ mb: 2 }}>
                      <Typography level="body-xs" sx={{ color: 'text.tertiary', mb: 0.5 }}>
                        Client ID
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography level="body-sm" sx={{ fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>
                          {app.clientId}
                        </Typography>
                        <Tooltip title="复制">
                          <IconButton size="sm" variant="plain" onClick={() => copyToClipboard(app.clientId)}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {/* Client Secret */}
                    <Box sx={{ mb: 2 }}>
                      <Typography level="body-xs" sx={{ color: 'text.tertiary', mb: 0.5 }}>
                        Client Secret
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography level="body-sm" sx={{ fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>
                          {visibleSecrets.has(app.id) ? app.clientSecret : '••••••••••••••••'}
                        </Typography>
                        <Tooltip title={visibleSecrets.has(app.id) ? '隐藏' : '显示'}>
                          <IconButton size="sm" variant="plain" onClick={() => toggleSecretVisibility(app.id)}>
                            {visibleSecrets.has(app.id) ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="复制">
                          <IconButton size="sm" variant="plain" onClick={() => copyToClipboard(app.clientSecret)}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="重新生成">
                          <IconButton size="sm" variant="plain" onClick={() => handleRegenerateSecret(app.id)}>
                            <RefreshIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {/* Redirect URIs */}
                    <Box sx={{ mb: 2 }}>
                      <Typography level="body-xs" sx={{ color: 'text.tertiary', mb: 0.5 }}>
                        重定向URI
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {JSON.parse(app.redirectUris).map((uri: string, index: number) => (
                          <Chip
                            key={index}
                            size="sm"
                            variant="outlined"
                            sx={{ maxWidth: '100%', whiteSpace: 'normal', wordBreak: 'break-all' }}
                          >
                            {uri}
                          </Chip>
                        ))}
                      </Box>
                    </Box>

                    {/* Scopes */}
                    <Box>
                      <Typography level="body-xs" sx={{ color: 'text.tertiary', mb: 0.5 }}>
                        授权范围
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {JSON.parse(app.scopes).map((scope: string, index: number) => (
                          <Chip key={index} size="sm" variant="soft" color="primary">{scope}</Chip>
                        ))}
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions>
                    <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                      创建于 {new Date(app.createdAt).toLocaleDateString('zh-CN')}
                    </Typography>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* 创建/编辑对话框 */}
        <Modal open={dialogOpen} onClose={handleCloseDialog}>
          <ModalDialog sx={{ maxWidth: 500 }}>
            <DialogTitle>
              {dialogMode === 'create' ? '创建应用' : '编辑应用'}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <FormControl required>
                  <FormLabel>应用名称</FormLabel>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>应用描述</FormLabel>
                  <Textarea
                    name="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    minRows={2}
                  />
                </FormControl>

                <FormControl required>
                  <FormLabel>重定向URI</FormLabel>
                  <Textarea
                    name="redirectUris"
                    value={formData.redirectUris}
                    onChange={(e) => setFormData((prev) => ({ ...prev, redirectUris: e.target.value }))}
                    minRows={3}
                  />
                  <FormHelperText>每行一个URI，例如: http://localhost:3000/callback</FormHelperText>
                </FormControl>

                <FormControl>
                  <FormLabel>授权范围</FormLabel>
                  <Input
                    name="scopes"
                    value={formData.scopes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, scopes: e.target.value }))}
                  />
                  <FormHelperText>空格分隔，支持: openid, profile, email, offline_access</FormHelperText>
                </FormControl>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button variant="plain" color="neutral" onClick={handleCloseDialog}>
                取消
              </Button>
              <Button onClick={handleSubmit} loading={dialogLoading}>
                确定
              </Button>
            </DialogActions>
          </ModalDialog>
        </Modal>

        {/* 删除确认对话框 */}
        <Modal open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <ModalDialog variant="outlined" role="alertdialog">
            <DialogTitle>
              <WarningIcon />
              确认删除
            </DialogTitle>
            <DialogContent>
              确定要删除应用 &quot;{appToDelete?.name}&quot; 吗？此操作不可撤销，所有相关的授权令牌都将失效。
            </DialogContent>
            <DialogActions>
              <Button variant="plain" color="neutral" onClick={() => setDeleteDialogOpen(false)}>
                取消
              </Button>
              <Button color="danger" onClick={handleDeleteConfirm}>
                删除
              </Button>
            </DialogActions>
          </ModalDialog>
        </Modal>

        {/* 权限管理对话框 */}
        <Modal open={permDialogOpen} onClose={() => setPermDialogOpen(false)}>
          <ModalDialog sx={{ maxWidth: 500 }}>
            <DialogTitle>
              <ShareIcon sx={{ mr: 1 }} />
              权限管理 - {permApp?.name}
            </DialogTitle>
            <DialogContent>
              <Typography level="body-sm" sx={{ mb: 2, color: 'text.secondary' }}>
                添加其他用户以允许他们查看或编辑此应用
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Input
                  placeholder="输入用户名"
                  value={newPermUsername}
                  onChange={(e) => setNewPermUsername(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <select
                  value={newPermType}
                  onChange={(e) => setNewPermType(e.target.value as 'view' | 'edit')}
                  style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  <option value="view">查看</option>
                  <option value="edit">编辑</option>
                </select>
                <Button startDecorator={<PersonAddIcon />} onClick={handleAddPermission}>
                  添加
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              {permLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size="sm" />
                </Box>
              ) : permissions.length === 0 ? (
                <Typography level="body-sm" sx={{ color: 'text.tertiary', textAlign: 'center', py: 2 }}>
                  暂无其他用户有权限访问此应用
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {permissions.map((perm) => (
                    <Box key={perm.userId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1, bgcolor: 'background.level1', borderRadius: 'sm' }}>
                      <Box>
                        <Typography level="body-sm" fontWeight="md">@{perm.username}</Typography>
                        <Chip size="sm" variant="soft" color={perm.permission === 'edit' ? 'warning' : 'neutral'}>
                          {perm.permission === 'edit' ? '可编辑' : '仅查看'}
                        </Chip>
                      </Box>
                      <IconButton size="sm" color="danger" onClick={() => handleRemovePermission(perm.userId)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              )}
            </DialogContent>
            <DialogActions>
              <Button variant="plain" onClick={() => setPermDialogOpen(false)}>
                关闭
              </Button>
            </DialogActions>
          </ModalDialog>
        </Modal>
      </Box>
    </DashboardLayout>
  );
}
