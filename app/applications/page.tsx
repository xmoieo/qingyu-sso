'use client';
/**
 * 应用管理页面（管理员/开发者）
 */
import { useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
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

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setDialogLoading(true);
    setError('');
    setSuccess('');

    // 解析重定向URI
    const redirectUris = formData.redirectUris
      .split('\n')
      .map((uri) => uri.trim())
      .filter((uri) => uri);

    if (redirectUris.length === 0) {
      setError('至少需要一个重定向URI');
      setDialogLoading(false);
      return;
    }

    // 解析scopes
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
        // 自动显示新密钥
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
          <Typography variant="h4" fontWeight="medium">
            应用管理
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('create')}
          >
            创建应用
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {applications.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography color="text.secondary">
                暂无应用，点击“创建应用”按钮添加您的第一个应用
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {applications.map((app) => (
              <Grid size={{ xs: 12, md: 6 }} key={app.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="h6">{app.name}</Typography>
                      <Box>
                        <IconButton size="small" onClick={() => handleOpenDialog('edit', app)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteClick(app)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    {app.description && (
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {app.description}
                      </Typography>
                    )}

                    <Divider sx={{ my: 2 }} />

                    {/* Client ID */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Client ID
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>
                          {app.clientId}
                        </Typography>
                        <Tooltip title="复制">
                          <IconButton size="small" onClick={() => copyToClipboard(app.clientId)}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {/* Client Secret */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Client Secret
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>
                          {visibleSecrets.has(app.id) ? app.clientSecret : '••••••••••••••••'}
                        </Typography>
                        <Tooltip title={visibleSecrets.has(app.id) ? '隐藏' : '显示'}>
                          <IconButton size="small" onClick={() => toggleSecretVisibility(app.id)}>
                            {visibleSecrets.has(app.id) ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="复制">
                          <IconButton size="small" onClick={() => copyToClipboard(app.clientSecret)}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="重新生成">
                          <IconButton size="small" onClick={() => handleRegenerateSecret(app.id)}>
                            <RefreshIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {/* Redirect URIs */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        重定向URI
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {JSON.parse(app.redirectUris).map((uri: string, index: number) => (
                          <Chip key={index} label={uri} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>

                    {/* Scopes */}
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        授权范围
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {JSON.parse(app.scopes).map((scope: string, index: number) => (
                          <Chip key={index} label={scope} size="small" color="primary" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      创建于 {new Date(app.createdAt).toLocaleDateString('zh-CN')}
                    </Typography>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* 创建/编辑对话框 */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {dialogMode === 'create' ? '创建应用' : '编辑应用'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="应用名称"
              name="name"
              value={formData.name}
              onChange={handleFormChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="应用描述"
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              margin="normal"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="重定向URI"
              name="redirectUris"
              value={formData.redirectUris}
              onChange={handleFormChange}
              margin="normal"
              required
              multiline
              rows={3}
              helperText="每行一个URI，例如: http://localhost:3000/callback"
            />
            <TextField
              fullWidth
              label="授权范围"
              name="scopes"
              value={formData.scopes}
              onChange={handleFormChange}
              margin="normal"
              helperText="空格分隔，支持: openid, profile, email, offline_access"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>取消</Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={dialogLoading}
            >
              {dialogLoading ? <CircularProgress size={24} /> : '确定'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
          <DialogTitle>确认删除</DialogTitle>
          <DialogContent>
            <Typography>
              确定要删除应用 “{appToDelete?.name}” 吗？此操作不可撤销，所有相关的授权令牌都将失效。
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
            <Button variant="contained" color="error" onClick={handleDeleteConfirm}>
              删除
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
