'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/store/admin';
import type { AdminProject } from '@/types';

type ModalType = 'delete' | null;

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function AdminProjectsPage() {
  const router = useRouter();
  const {
    projects,
    projectsTotal,
    projectsPage,
    projectsTotalPages,
    projectsSearch,
    projectsSortBy,
    projectsSortOrder,
    projectsLoading,
    fetchProjects,
    deleteProject,
    setProjectsSearch,
  } = useAdminStore();

  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedProject, setSelectedProject] = useState<AdminProject | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const openModal = (type: ModalType, project?: AdminProject) => {
    setError('');
    setModalType(type);
    setSelectedProject(project || null);
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedProject(null);
    setError('');
  };

  const handleDelete = async () => {
    if (!selectedProject) return;

    try {
      await deleteProject(selectedProject._id);
      closeModal();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || '删除失败');
    }
  };

  const handleSearch = () => {
    fetchProjects({ page: 1, search: searchInput });
    setProjectsSearch(searchInput);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= projectsTotalPages) {
      fetchProjects({ page: newPage });
    }
  };

  const handleSort = (field: string) => {
    const newOrder =
      projectsSortBy === field && projectsSortOrder === 'desc' ? 'asc' : 'desc';
    fetchProjects({ sortBy: field, sortOrder: newOrder });
  };

  const getSortIcon = (field: string) => {
    if (projectsSortBy !== field) return '↕';
    return projectsSortOrder === 'desc' ? '↓' : '↑';
  };

  const handleEditProject = (projectId: string) => {
    window.open(`/editor/${projectId}`, '_blank');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">项目管理</h1>
      </div>

      {/* Search */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="搜索项目名称..."
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
        {projectsSearch && (
          <button
            onClick={() => {
              setSearchInput('');
              setProjectsSearch('');
              fetchProjects({ page: 1, search: '' });
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
          >
            清除
          </button>
        )}
      </div>

      {/* Projects table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                项目
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('fileSize')}
              >
                大小 {getSortIcon('fileSize')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                所有者
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('createdAt')}
              >
                创建时间 {getSortIcon('createdAt')}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('updatedAt')}
              >
                修改时间 {getSortIcon('updatedAt')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projectsLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  加载中...
                </td>
              </tr>
            ) : projects.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  暂无项目
                </td>
              </tr>
            ) : (
              projects.map((project) => (
                <tr key={project._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {project.thumbnail ? (
                        <img
                          src={project.thumbnail}
                          alt={project.title}
                          className="w-12 h-9 rounded object-cover bg-gray-100"
                        />
                      ) : (
                        <div className="w-12 h-9 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                          无图
                        </div>
                      )}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {project.title}
                        </div>
                        {project.isPublic && (
                          <span className="text-xs text-green-600">已公开</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatFileSize(project.fileSize)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{project.ownerName}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditProject(project._id)}
                      className="text-orange-600 hover:text-orange-900 mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => openModal('delete', project)}
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
      {projectsTotalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            共 {projectsTotal} 条记录，第 {projectsPage} / {projectsTotalPages} 页
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(projectsPage - 1)}
              disabled={projectsPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              上一页
            </button>
            <button
              onClick={() => handlePageChange(projectsPage + 1)}
              disabled={projectsPage === projectsTotalPages}
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modalType === 'delete' && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">删除项目</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <p className="text-gray-600">
              确定要删除项目 <strong>{selectedProject.title}</strong> 吗？
              <br />
              <span className="text-sm text-gray-500">
                所有者: {selectedProject.ownerName}
              </span>
              <br />
              <span className="text-red-600 text-sm">
                此操作无法恢复，项目数据将被永久删除。
              </span>
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
