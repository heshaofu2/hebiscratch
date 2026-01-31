'use client';

import { useEffect, useState } from 'react';
import { useAdminStore } from '@/store/admin';
import type { AdminUser, UserCreateData, UserUpdateData } from '@/types';

type ModalType = 'create' | 'edit' | 'delete' | 'resetPassword' | null;

export default function AdminUsersPage() {
  const {
    users,
    total,
    page,
    pageSize,
    totalPages,
    search,
    isLoading,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    resetPassword,
    setSearch,
  } = useAdminStore();

  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user',
    is_active: true,
  });
  const [newPassword, setNewPassword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openModal = (type: ModalType, user?: AdminUser) => {
    setError('');
    setModalType(type);
    setSelectedUser(user || null);

    if (type === 'create') {
      setFormData({ username: '', password: '', role: 'user', is_active: true });
    } else if (type === 'edit' && user) {
      setFormData({
        username: user.username,
        password: '',
        role: user.role,
        is_active: user.isActive,
      });
    } else if (type === 'resetPassword') {
      setNewPassword('');
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedUser(null);
    setError('');
  };

  const handleCreate = async () => {
    if (!formData.username || !formData.password) {
      setError('用户名和密码不能为空');
      return;
    }

    try {
      await createUser(formData as UserCreateData);
      closeModal();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '创建失败');
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;

    const data: UserUpdateData = {};
    if (formData.username !== selectedUser.username) {
      data.username = formData.username;
    }
    if (formData.role !== selectedUser.role) {
      data.role = formData.role;
    }
    if (formData.is_active !== selectedUser.isActive) {
      data.is_active = formData.is_active;
    }

    if (Object.keys(data).length === 0) {
      closeModal();
      return;
    }

    try {
      await updateUser(selectedUser._id, data);
      closeModal();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '更新失败');
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;

    try {
      await deleteUser(selectedUser._id);
      closeModal();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '删除失败');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      setError('请输入新密码');
      return;
    }

    try {
      await resetPassword(selectedUser._id, newPassword);
      closeModal();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '重置密码失败');
    }
  };

  const handleSearch = () => {
    fetchUsers({ page: 1, search: searchInput });
    setSearch(searchInput);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchUsers({ page: newPage });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">用户管理</h1>
        <button
          onClick={() => openModal('create')}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
        >
          创建用户
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="搜索用户名..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
        >
          搜索
        </button>
        {search && (
          <button
            onClick={() => {
              setSearchInput('');
              setSearch('');
              fetchUsers({ page: 1, search: '' });
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
          >
            清除
          </button>
        )}
      </div>

      {/* Users table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                用户名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                角色
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                创建时间
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  暂无用户
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-medium">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {user.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.role === 'admin' ? '管理员' : '用户'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.isActive ? '正常' : '禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openModal('edit', user)}
                      className="text-orange-600 hover:text-orange-900 mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => openModal('resetPassword', user)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      重置密码
                    </button>
                    <button
                      onClick={() => openModal('delete', user)}
                      className="text-red-600 hover:text-red-900"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            共 {total} 条记录，第 {page} / {totalPages} 页
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              上一页
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">
              {modalType === 'create' && '创建用户'}
              {modalType === 'edit' && '编辑用户'}
              {modalType === 'delete' && '删除用户'}
              {modalType === 'resetPassword' && '重置密码'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {(modalType === 'create' || modalType === 'edit') && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    用户名
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {modalType === 'create' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      密码
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    角色
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="user">用户</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="is_active"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    启用账号
                  </label>
                </div>
              </div>
            )}

            {modalType === 'delete' && (
              <p className="text-gray-600">
                确定要删除用户 <strong>{selectedUser?.username}</strong> 吗？
                <br />
                <span className="text-red-600 text-sm">
                  此操作将同时删除该用户的所有项目，且无法恢复。
                </span>
              </p>
            )}

            {modalType === 'resetPassword' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新密码
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码（至少 6 位）"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (modalType === 'create') handleCreate();
                  else if (modalType === 'edit') handleUpdate();
                  else if (modalType === 'delete') handleDelete();
                  else if (modalType === 'resetPassword') handleResetPassword();
                }}
                className={`px-4 py-2 rounded-lg transition ${
                  modalType === 'delete'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {modalType === 'create' && '创建'}
                {modalType === 'edit' && '保存'}
                {modalType === 'delete' && '删除'}
                {modalType === 'resetPassword' && '重置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
