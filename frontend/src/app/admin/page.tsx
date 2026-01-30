'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Stats {
  totalUsers: number;
  totalProjects: number;
  totalMistakes: number;
  todayUsers: number;
  todayProjects: number;
  todayMistakes: number;
}

interface User {
  id: string;
  username: string;
  avatar: string | null;
  projectCount: number;
  mistakeCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UserListResponse {
  total: number;
  users: User[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authHeader, setAuthHeader] = useState('');

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': authHeader,
      },
    });
  }, [authHeader]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [fetchWithAuth]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        skip: String(page * 20),
        limit: '20',
      });
      if (search) {
        params.set('search', search);
      }
      const res = await fetchWithAuth(`${API_BASE}/admin/users?${params}`);
      if (res.ok) {
        const data: UserListResponse = await res.json();
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchWithAuth, page, search]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
      fetchUsers();
    }
  }, [isAuthenticated, fetchStats, fetchUsers]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const auth = 'Basic ' + btoa(`${username}:${password}`);

    try {
      const res = await fetch(`${API_BASE}/admin/stats`, {
        headers: { 'Authorization': auth },
      });

      if (res.ok) {
        setAuthHeader(auth);
        setIsAuthenticated(true);
      } else {
        setError('用户名或密码错误');
      }
    } catch (err) {
      setError('连接失败，请检查服务是否正常');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`确定要删除用户 "${user.username}" 吗？\n\n这将同时删除该用户的所有项目和错题，此操作不可恢复。`)) {
      return;
    }

    try {
      const res = await fetchWithAuth(`${API_BASE}/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchUsers();
        fetchStats();
      } else {
        alert('删除失败');
      }
    } catch (err) {
      alert('删除失败');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchUsers();
  };

  // 登录页面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">管理后台</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入用户名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入密码"
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              登录
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 管理后台页面
  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航 */}
      <nav className="bg-blue-600 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Scratch 管理后台</h1>
          <button
            onClick={() => {
              setIsAuthenticated(false);
              setAuthHeader('');
            }}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg transition"
          >
            退出登录
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
              <div className="text-gray-500 text-sm">总用户数</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{stats.totalProjects}</div>
              <div className="text-gray-500 text-sm">总项目数</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{stats.totalMistakes}</div>
              <div className="text-gray-500 text-sm">总错题数</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-500">
              <div className="text-2xl font-bold text-green-600">{stats.todayUsers}</div>
              <div className="text-gray-500 text-sm">今日新增用户</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-500">
              <div className="text-2xl font-bold text-green-600">{stats.todayProjects}</div>
              <div className="text-gray-500 text-sm">今日新增项目</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-500">
              <div className="text-2xl font-bold text-green-600">{stats.todayMistakes}</div>
              <div className="text-gray-500 text-sm">今日新增错题</div>
            </div>
          </div>
        )}

        {/* 用户列表 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">用户列表</h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="搜索用户名..."
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
              >
                搜索
              </button>
            </form>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">用户名</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">项目数</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">错题数</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">注册时间</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                            {user.username[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user.projectCount}</td>
                      <td className="px-4 py-3 text-gray-600">{user.mistakeCount}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(user.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="px-3 py-1 bg-red-100 text-red-600 text-sm rounded hover:bg-red-200 transition"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        暂无用户数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* 分页 */}
              {total > 20 && (
                <div className="p-4 border-t flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    共 {total} 条记录
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition disabled:opacity-50"
                    >
                      上一页
                    </button>
                    <span className="px-3 py-1 text-gray-600">
                      {page + 1} / {Math.ceil(total / 20)}
                    </span>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={(page + 1) * 20 >= total}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition disabled:opacity-50"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
