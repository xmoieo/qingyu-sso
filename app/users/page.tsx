'use client';
/**
 * 用户管理页面（管理员）
 */
import { useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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

  const getRoleColor = (role: UserRole): 'error' | 'warning' | 'default' => {
    switch (role) {
      case UserRole.ADMIN:
        return 'error';
      case UserRole.DEVELOPER:
        return 'warning';
      default:
        return 'default';
    }
  };

  const columns: GridColDef[] = [
    { field: 'username', headerName: '用户名', flex: 1, minWidth: 120 },
    { field: 'email', headerName: '邮箱', flex: 1.5, minWidth: 200 },
    { field: 'nickname', headerName: '昵称', flex: 1, minWidth: 100 },
    {
      field: 'role',
      headerName: '角色',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={getRoleLabel(params.value)}
          size="small"
          color={getRoleColor(params.value)}
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: '注册时间',
      width: 120,
      valueFormatter: (value: string) => new Date(value).toLocaleDateString('zh-CN'),
    },
    {
      field: 'actions',
      headerName: '操作',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleOpenDialog('edit', params.row)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeleteClick(params.row)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight="medium">
            用户管理
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('create')}
          >
            创建用户
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

        <Card>
          <CardContent>
            <DataGrid
              rows={users}
              columns={columns}
              loading={loading}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10 } },
              }}
              disableRowSelectionOnClick
              autoHeight
            />
          </CardContent>
        </Card>

        {/* 创建/编辑对话框 */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {dialogMode === 'create' ? '创建用户' : '编辑用户'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="用户名"
              name="username"
              value={formData.username}
              onChange={handleFormChange}
              margin="normal"
              required
              disabled={dialogMode === 'edit'}
              helperText={dialogMode === 'edit' ? '用户名不可修改' : '3-20位字母、数字或下划线'}
            />
            <TextField
              fullWidth
              label="邮箱"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleFormChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="昵称"
              name="nickname"
              value={formData.nickname}
              onChange={handleFormChange}
              margin="normal"
            />
            <TextField
              fullWidth
              label={dialogMode === 'create' ? '密码' : '新密码（留空则不修改）'}
              name="password"
              type="password"
              value={formData.password}
              onChange={handleFormChange}
              margin="normal"
              required={dialogMode === 'create'}
              helperText="至少6位字符"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>角色</InputLabel>
              <Select
                value={formData.role}
                label="角色"
                onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value as UserRole }))}
              >
                <MenuItem value={UserRole.USER}>普通用户</MenuItem>
                <MenuItem value={UserRole.DEVELOPER}>开发者</MenuItem>
                <MenuItem value={UserRole.ADMIN}>管理员</MenuItem>
              </Select>
            </FormControl>
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
              确定要删除用户 “{userToDelete?.username}” 吗？此操作不可撤销。
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
