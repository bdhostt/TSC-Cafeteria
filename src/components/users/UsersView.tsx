import React, { useState } from 'react';
import { useRestaurant, DEFAULT_ROLE_PERMISSIONS, DEFAULT_USERS } from '../../context/RestaurantContext';
import { AppUser, UserRole, ActiveTab } from '../../types';
import { 
  Users, 
  ShieldCheck, 
  UserPlus, 
  Key, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Edit3, 
  Shield, 
  Phone, 
  Layers,
  Save,
  AlertTriangle
} from 'lucide-react';

const ROLE_DEFINITIONS: Array<{ role: UserRole; title: string; desc: string; color: string }> = [
  { role: 'ADMIN', title: 'System Administrator', desc: 'Full unrestricted system access to all modules, financial data, and configurations.', color: 'border-purple-500 bg-purple-50 text-purple-800' },
  { role: 'MANAGER', title: 'Restaurant / Floor Manager', desc: 'Operational control over POS, menu recipes, purchases, billing, stock, and reports.', color: 'border-blue-500 bg-blue-50 text-blue-800' },
  { role: 'CASHIER', title: 'Billing Cashier', desc: 'Live POS order settlement, sales register, receipt printing, and customer receivables.', color: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
  { role: 'WAITER', title: 'Service Waiter', desc: 'Taking table food orders, sending kitchen KOTs, and managing floor tables.', color: 'border-amber-500 bg-amber-50 text-amber-800' },
  { role: 'CHEF', title: 'Kitchen Executive Chef', desc: 'Kitchen order display, recipe ingredients, inventory usage, and raw materials.', color: 'border-orange-500 bg-orange-50 text-orange-800' }
];

const ALL_MODULES: Array<{ id: ActiveTab; label: string; group: string }> = [
  { id: 'dashboard', label: 'Executive Dashboard', group: 'Overview' },
  { id: 'pos', label: 'Live Tables & POS Billing', group: 'Operations' },
  { id: 'menu-items', label: 'Menu & Recipe BOM', group: 'Catalog' },
  { id: 'sales', label: 'Sales & Customer Dues', group: 'Finance' },
  { id: 'expenses', label: 'Operating Expenses', group: 'Finance' },
  { id: 'purchases', label: 'Purchases & Stock Inward', group: 'Inventory' },
  { id: 'payables', label: 'Vendor Payables Ledger', group: 'Finance' },
  { id: 'receivables', label: 'Customer Receivables Ledger', group: 'Finance' },
  { id: 'inv-items', label: 'Raw Materials Master', group: 'Inventory' },
  { id: 'inventory', label: 'Stock Ledger & Valuation', group: 'Inventory' },
  { id: 'reports', label: 'Reports & Business Analytics', group: 'Analytics' },
  { id: 'users', label: 'Users & Roles (RBAC)', group: 'Administration' },
  { id: 'heads', label: 'System Configurations', group: 'Administration' },
  { id: 'data-cleanup', label: 'Data Management & Cleanup', group: 'Administration' }
];

export const UsersView: React.FC = () => {
  const { 
    data, 
    currentUser, 
    addUser, 
    editUser, 
    deleteUser, 
    updateRolePermissions
  } = useRestaurant();

  const usersList: AppUser[] = data.users && data.users.length > 0 ? data.users : DEFAULT_USERS;
  const rolePermissions = data.rolePermissions || DEFAULT_ROLE_PERMISSIONS;

  const [activeSubTab, setActiveSubTab] = useState<'users' | 'roles'>('users');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    username: string;
    email: string;
    pinOrPassword: string;
    role: UserRole;
    phone: string;
    isActive: boolean;
  }>({
    name: '',
    username: '',
    email: '',
    pinOrPassword: '',
    role: 'CASHIER',
    phone: '',
    isActive: true
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      username: '',
      email: '',
      pinOrPassword: '123',
      role: 'CASHIER',
      phone: '',
      isActive: true
    });
    setEditingUserId(null);
    setIsAddUserModalOpen(true);
  };

  const handleOpenEdit = (user: AppUser) => {
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email || '',
      pinOrPassword: user.pinOrPassword || '',
      role: user.role,
      phone: user.phone || '',
      isActive: user.isActive !== false
    });
    setEditingUserId(user.id);
    setIsAddUserModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim()) {
      alert('Please provide Name and Username');
      return;
    }

    const cleanPin = formData.pinOrPassword.trim();
    if (!cleanPin) {
      alert('Please provide a unique Security PIN for this operator.');
      return;
    }

    const pinConflict = usersList.find(u => 
      u.id !== editingUserId && 
      u.isActive !== false && 
      (u.pinOrPassword || '').trim() === cleanPin
    );

    if (pinConflict) {
      alert(`PIN "${cleanPin}" is already assigned to "${pinConflict.name}" (${pinConflict.role}).\n\nEach staff member must have a unique PIN so the system can automatically identify them upon login.`);
      return;
    }

    if (editingUserId) {
      editUser(editingUserId, {
        name: formData.name.trim(),
        username: formData.username.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase() || undefined,
        pinOrPassword: cleanPin,
        role: formData.role,
        phone: formData.phone.trim(),
        isActive: formData.isActive
      });
    } else {
      addUser({
        name: formData.name.trim(),
        username: formData.username.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase() || undefined,
        pinOrPassword: cleanPin,
        role: formData.role,
        phone: formData.phone.trim(),
        isActive: formData.isActive
      });
    }
    setIsAddUserModalOpen(false);
  };


  const togglePermissionForRole = (role: UserRole, tabId: ActiveTab) => {
    const currentPerms = rolePermissions[role] || DEFAULT_ROLE_PERMISSIONS[role] || [];
    let updated: ActiveTab[];
    if (currentPerms.includes(tabId)) {
      updated = currentPerms.filter(t => t !== tabId);
    } else {
      updated = [...currentPerms, tabId];
    }
    updateRolePermissions(role, updated);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              User & Role Access Management (RBAC)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Manage system operators, secure login credentials, and assign module-level access permissions
            </p>
          </div>
        </div>

        {/* Current User Quick Badge */}
        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-7 h-7 rounded-lg bg-[#004b9b] text-white font-bold flex items-center justify-center text-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800">{currentUser.name}</div>
                <div className="text-[10px] font-extrabold text-blue-700 uppercase">{currentUser.role}</div>
              </div>
            </div>
          ) : (
            <span className="text-xs text-rose-600 font-bold bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
              Not Logged In
            </span>
          )}

          <button
            id="btn-add-new-user"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            activeSubTab === 'users'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users Directory ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('roles')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer ${
            activeSubTab === 'roles'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Role Permissions Matrix</span>
        </button>
      </div>

      {/* TAB 1: USERS DIRECTORY */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {usersList.map(user => {
              const isCurrent = currentUser?.id === user.id;
              const roleDef = ROLE_DEFINITIONS.find(r => r.role === user.role);

              return (
                <div 
                  key={user.id}
                  className={`bg-white rounded-2xl border p-4 shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                    isCurrent ? 'border-purple-400 ring-2 ring-purple-400/20' : 'border-slate-200'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#004b9b] text-white font-black text-base flex items-center justify-center shadow-xs">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-slate-900 leading-snug">{user.name}</h3>
                            {isCurrent && (
                              <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-mono">@{user.username}</p>
                        </div>
                      </div>

                      <span className={`text-[10px] font-extrabold uppercase px-2 py-1 rounded-lg border ${
                        roleDef ? roleDef.color : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {user.role}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="mt-4 space-y-2 text-xs border-t border-slate-100 pt-3">
                      {user.email && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                            <span className="text-slate-400">@</span> Email:
                          </span>
                          <span className="font-mono text-[11px] text-slate-700 font-semibold">{user.email}</span>
                        </div>
                      )}

                      {user.phone && (
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                            <Phone className="w-3.5 h-3.5" /> Phone:
                          </span>
                          <span className="font-medium text-slate-700">{user.phone}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                          <Key className="w-3.5 h-3.5" /> PIN / Password:
                        </span>
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-800 font-bold">
                          {user.pinOrPassword ? '••••' : 'No PIN'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                          <Layers className="w-3.5 h-3.5" /> Allowed Modules:
                        </span>
                        <span className="font-bold text-slate-800">
                          {user.role === 'ADMIN' ? 'All (Unrestricted)' : `${(user.permissions || []).length} modules`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenEdit(user)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Edit User Profile & Permissions"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit User</span>
                    </button>

                    {user.id !== 'USR-01' && (
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: ROLE PERMISSION MATRIX */}
      {activeSubTab === 'roles' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black text-slate-900">Role-Based Access Control (RBAC) Matrix</h2>
              <p className="text-xs text-slate-500">Configure which modules each staff role can view and operate in the system</p>
            </div>
            <div className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>ADMIN role always has full unrestricted access</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Module Name</th>
                  <th className="p-3">Group</th>
                  <th className="p-3 text-center text-purple-900 bg-purple-50/70">ADMIN</th>
                  <th className="p-3 text-center text-blue-900 bg-blue-50/70">MANAGER</th>
                  <th className="p-3 text-center text-emerald-900 bg-emerald-50/70">CASHIER</th>
                  <th className="p-3 text-center text-amber-900 bg-amber-50/70">WAITER</th>
                  <th className="p-3 text-center text-orange-900 bg-orange-50/70">CHEF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {ALL_MODULES.map(mod => {
                  return (
                    <tr key={mod.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-900">{mod.label}</td>
                      <td className="p-3">
                        <span className="text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {mod.group}
                        </span>
                      </td>

                      {/* ADMIN Column (Always true) */}
                      <td className="p-3 text-center bg-purple-50/30">
                        <div className="flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-purple-600" />
                        </div>
                      </td>

                      {/* MANAGER */}
                      <td className="p-3 text-center bg-blue-50/30">
                        <button
                          onClick={() => togglePermissionForRole('MANAGER', mod.id)}
                          className="p-1 rounded hover:bg-blue-100 transition inline-flex items-center justify-center"
                        >
                          {(rolePermissions.MANAGER || []).includes(mod.id) ? (
                            <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>

                      {/* CASHIER */}
                      <td className="p-3 text-center bg-emerald-50/30">
                        <button
                          onClick={() => togglePermissionForRole('CASHIER', mod.id)}
                          className="p-1 rounded hover:bg-emerald-100 transition inline-flex items-center justify-center"
                        >
                          {(rolePermissions.CASHIER || []).includes(mod.id) ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>

                      {/* WAITER */}
                      <td className="p-3 text-center bg-amber-50/30">
                        <button
                          onClick={() => togglePermissionForRole('WAITER', mod.id)}
                          className="p-1 rounded hover:bg-amber-100 transition inline-flex items-center justify-center"
                        >
                          {(rolePermissions.WAITER || []).includes(mod.id) ? (
                            <CheckCircle2 className="w-4 h-4 text-amber-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>

                      {/* CHEF */}
                      <td className="p-3 text-center bg-orange-50/30">
                        <button
                          onClick={() => togglePermissionForRole('CHEF', mod.id)}
                          className="p-1 rounded hover:bg-orange-100 transition inline-flex items-center justify-center"
                        >
                          {(rolePermissions.CHEF || []).includes(mod.id) ? (
                            <CheckCircle2 className="w-4 h-4 text-orange-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h2 className="text-base font-black text-slate-900 mb-4">
              {editingUserId ? 'Edit Operator Profile' : 'Add New Operator Account'}
            </h2>

            <form onSubmit={handleSaveUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Tanvir Ahmed"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    placeholder="e.g. tanvir"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Security PIN</label>
                  <input
                    type="text"
                    value={formData.pinOrPassword}
                    onChange={e => setFormData({ ...formData, pinOrPassword: e.target.value })}
                    placeholder="e.g. 123"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. staff@barcodecafe.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. +880 1711-000000"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">System Role *</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold"
                >
                  <option value="ADMIN">ADMIN (Full Access)</option>
                  <option value="MANAGER">MANAGER (Operations & Menu)</option>
                  <option value="CASHIER">CASHIER (Live POS & Billing)</option>
                  <option value="WAITER">WAITER (Table Orders & KOT)</option>
                  <option value="CHEF">CHEF (Kitchen & Recipe BOM)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveUser"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="isActiveUser" className="text-xs font-bold text-slate-700">
                  Account Active & Enabled for Sign In
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Operator</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
