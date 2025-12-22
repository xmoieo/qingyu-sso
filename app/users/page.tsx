'use client';
/**
 * 用户管理页面（管理员）
 */
import { useEffect, useState, useCallback } from 'react';
import Box from '@mui/joy/Box';
import Card from '@mui/joy/Card';
import Button from '@mui/joy/Button';
import Typography from '@mui/joy/Typography';
import Alert from '@mui/joy/Alert';
import Modal from '@mui/joy/Modal';
import ModalDialog from '@mui/joy/ModalDialog';
import DialogTitle from '@mui/joy/DialogTitle';
import DialogContent from '@mui/joy/DialogContent';
import DialogActions from '@mui/joy/DialogActions';
import Input from '@mui/joy/Input';
import FormControl from '@mui/joy/FormControl';
import FormLabel from '@mui/joy/FormLabel';
import FormHelperText from '@mui/joy/FormHelperText';
import Select from '@mui/joy/Select';
import Option from '@mui/joy/Option';
import IconButton from '@mui/joy/IconButton';
import Chip from '@mui/joy/Chip';
import CircularProgress from '@mui/joy/CircularProgress';
import Table from '@mui/joy/Table';
import Sheet from '@mui/joy/Sheet';
import Stack from '@mui/joy/Stack';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { DashboardLayout } from '@/components/layout';
import { UserRole } from '@/lib/types';

interface User {
  id: string;
  username: string;
  email: string;
  nickname?: string;
  role: UserRole;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 对话框状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogLoading, setDialogLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 删除确认对话框
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // 表单数据
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    nickname: '',
    role: UserRole.USER as UserRole,
  });

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users');
      const result = await response.json();
      if (result.success) {
        setUsers(result.data.users);
      } else {
        setError(result.error || '获取用户列表失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenDialog = (mode: 'create' | 'edit', user?: User) => {
    setDialogMode(mode);
    if (mode === 'edit' && user) {
      setSelectedUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        password: '',
        nickname: user.nickname || '',
        role: user.role,
      });
    } else {
      setSelectedUser(null);
      setFormData({
        username: '',
        email: '',
        password: '',
        nickname: '',
        role: UserRole.USER,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedUser(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setDialogLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = dialogMode === 'create' ? '/api/admin/users' : `/api/admin/users/${selectedUser?.id}`;
      const method = dialogMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(dialogMode === 'create' ? '用户创建成功' : '用户更新成功');
        handleCloseDialog();
        fetchUsers();
      } else {
        setError(result.error || '操作失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setDialogLoading(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('用户删除成功');
        fetchUsers();
      } else {
        setError(result.error || '删除失败');
      }
    } catch {
      setError('网络错误，请稍后重试');
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return '管理员';
      case UserRole.DEVELOPER:
        return '开发者';
      case UserRole.USER:
        return '普通用户';
      default:
        return '未知';
    }
  };

  const getRoleColor = (role: UserRole): 'danger' | 'warning' | 'neutral' => {
    switch (role) {
      case UserRole.ADMIN:
        return 'danger';
      case UserRole.DEVELOPER:
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <DashboardLayout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography level="h2">用户管理</Typography>
          <Button
            startDecorator={<AddIcon />}
            onClick={() => handleOpenDialog('create')}
          >
            创建用户
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

        <Card variant="outlined">
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Sheet sx={{ overflow: 'auto' }}>
              <Table
                stickyHeader
                hoverRow
                sx={{
                  '--TableCell-headBackground': 'var(--joy-palette-background-level1)',
                }}
              >
                <thead>
                  <tr>
                    <th style={{ width: 150 }}>用户名</th>
                    <th style={{ width: 200 }}>邮箱</th>
                    <th style={{ width: 120 }}>昵称</th>
                    <th style={{ width: 100 }}>角色</th>
                    <th style={{ width: 120 }}>注册时间</th>
                    <th style={{ width: 100 }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>{user.nickname || '-'}</td>
                      <td>
                        <Chip
                          size="sm"
                          variant="soft"
                          color={getRoleColor(user.role)}
                        >
                          {getRoleLabel(user.role)}
                        </Chip>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString('zh-CN')}</td>
                      <td>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton
                            size="sm"
                            variant="plain"
                            onClick={() => handleOpenDialog('edit', user)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="sm"
                            variant="plain"
                            color="danger"
                            onClick={() => handleDeleteClick(user)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                        暂无用户数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Sheet>
          )}
        </Card>

        {/* 创建/编辑对话框 */}
        <Modal open={dialogOpen} onClose={handleCloseDialog}>
          <ModalDialog>
            <DialogTitle>
              {dialogMode === 'create' ? '创建用户' : '编辑用户'}
            </DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <FormControl required>
                  <FormLabel>用户名</FormLabel>
                  <Input
                    name="username"
                    value={formData.username}
                    onChange={handleFormChange}
                    disabled={dialogMode === 'edit'}
                  />
                  <FormHelperText>
                    {dialogMode === 'edit' ? '用户名不可修改' : '3-20位字母、数字或下划线'}
                  </FormHelperText>
                </FormControl>

                <FormControl required>
                  <FormLabel>邮箱</FormLabel>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleFormChange}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>昵称</FormLabel>
                  <Input
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleFormChange}
                  />
                </FormControl>

                <FormControl required={dialogMode === 'create'}>
                  <FormLabel>
                    {dialogMode === 'create' ? '密码' : '新密码（留空则不修改）'}
                  </FormLabel>
                  <Input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleFormChange}
                  />
                  <FormHelperText>至少6位字符</FormHelperText>
                </FormControl>

                <FormControl>
                  <FormLabel>角色</FormLabel>
                  <Select
                    value={formData.role}
                    onChange={(_, value) => value && setFormData((prev) => ({ ...prev, role: value }))}
                  >
                    <Option value={UserRole.USER}>普通用户</Option>
                    <Option value={UserRole.DEVELOPER}>开发者</Option>
                    <Option value={UserRole.ADMIN}>管理员</Option>
                  </Select>
                </FormControl>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button variant="plain" color="neutral" onClick={handleCloseDialog}>
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                loading={dialogLoading}
              >
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
              确定要删除用户 &quot;{userToDelete?.username}&quot; 吗？此操作不可撤销。
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
      </Box>
    </DashboardLayout>
  );
}
