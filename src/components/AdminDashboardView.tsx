import React, { useState } from 'react';
import { RefreshCw, Search, Shield } from 'lucide-react';
import { UserProfile, ApprovalStatus } from '../types';

interface AdminDashboardViewProps {
  users: UserProfile[];
  onRefreshUsers: () => Promise<void>;
  onUpdateUserStatus: (userId: string, status: ApprovalStatus) => void;
  onToggleAdminRole: (userId: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  users,
  onRefreshUsers,
  onUpdateUserStatus,
  onToggleAdminRole,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshUsers = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshUsers();
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = users.filter(u => u.approval_status === 'pending').length;
  const approvedCount = users.filter(u => u.approval_status === 'approved').length;

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Admin & Access Control Dashboard</h2>
          <p className="text-xs text-gray-500 mt-1">Manage user access approval requests, roles, and platform security</p>
        </div>
        <button
          type="button"
          onClick={() => void handleRefreshUsers()}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh users'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase">Total Registered Users</span>
          <h3 className="text-3xl font-bold text-gray-900 mt-2">{users.length}</h3>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase">Pending Approvals</span>
          <h3 className="text-3xl font-bold text-amber-600 mt-2">{pendingCount}</h3>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase">Active Users</span>
          <h3 className="text-3xl font-bold text-emerald-600 mt-2">{approvedCount}</h3>
        </div>
      </div>

      {/* Users Management Table */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900">User Access Management</h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search user by name or email..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#7657E8]/20"
            />
          </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
              <th className="p-3">User</th>
              <th className="p-3">Role</th>
              <th className="p-3">Approval Status</th>
              <th className="p-3">Registered Date</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-sm text-gray-500">
                  {searchTerm ? 'No users match your search.' : 'No user profiles found. Refresh the list or check Supabase Auth and profile setup.'}
                </td>
              </tr>
            ) : filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="p-3 flex items-center gap-3">
                  <img src={u.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'} alt={u.full_name} className="w-9 h-9 rounded-full object-cover" />
                  <div>
                    <h4 className="font-bold text-gray-900">{u.full_name}</h4>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                </td>
                <td className="p-3">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                    u.role === 'admin' ? 'bg-[#7657E8]/10 text-[#7657E8]' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {u.role === 'admin' && <Shield className="w-3.5 h-3.5" />}
                    <span>{u.role}</span>
                  </span>
                </td>
                <td className="p-3">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                    u.approval_status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                    u.approval_status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {u.approval_status}
                  </span>
                </td>
                <td className="p-3 text-xs text-gray-500">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="p-3 text-right space-x-2">
                  {u.approval_status !== 'approved' && (
                    <button
                      onClick={() => onUpdateUserStatus(u.id, 'approved')}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                  )}
                  {u.approval_status !== 'rejected' && u.approval_status !== 'suspended' && (
                    <button
                      onClick={() => onUpdateUserStatus(u.id, 'rejected')}
                      className="px-3 py-1.5 bg-red-100 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-200"
                    >
                      Reject
                    </button>
                  )}
                  {u.approval_status === 'approved' && (
                    <button
                      onClick={() => onUpdateUserStatus(u.id, 'suspended')}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-300"
                    >
                      Suspend
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
