'use client';

import { useState, useEffect } from 'react';
import { UserService } from '@/lib/services/user.service';
import { User, UserQuery, UserRole, CreateUserRequest, UpdateUserRequest } from '@/lib/types/user.types';
import { TelemetryErrorBoundary } from '@/app/components/TelemetryErrorBoundary';
import { useToast } from '@/app/components/ToastProvider';

interface UserFormData {
  email: string;
  role: UserRole;
}

export default function SettingsUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({ email: '', role: 'STAFF' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  const { showToast } = useToast();
  const limit = 20;

  const loadUsers = async () => {
    try {
      setLoading(true);
      const query: UserQuery = {
        page: currentPage,
        limit,
        ...(searchTerm && { search: searchTerm }),
        ...(roleFilter && { role: roleFilter as UserRole }),
      };
      
      const response = await UserService.getUsers(query);
      setUsers(response.users);
      setTotal(response.total);
    } catch (error) {
      showToast('error', 'Failed to load users');
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchTerm, roleFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadUsers();
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({ email: '', role: 'STAFF' });
    setFormErrors({});
    setShowCreateForm(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({ email: user.email, role: user.role });
    setFormErrors({});
    setShowCreateForm(true);
  };

  const handleCloseForm = () => {
    setShowCreateForm(false);
    setEditingUser(null);
    setFormData({ email: '', role: 'STAFF' });
    setFormErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.role) {
      errors.role = 'Role is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    try {
      if (editingUser) {
        // Update existing user
        const updateData: UpdateUserRequest = {};
        if (formData.email !== editingUser.email) updateData.email = formData.email;
        if (formData.role !== editingUser.role) updateData.role = formData.role;
        
        if (Object.keys(updateData).length === 0) {
          showToast('info', 'No changes to save');
          handleCloseForm();
          return;
        }
        
        const result = await UserService.updateUser(editingUser.id, updateData);
        
        if (result.success) {
          showToast('success', 'User updated successfully');
          handleCloseForm();
          loadUsers();
        } else {
          showToast('error', result.error);
        }
      } else {
        // Create new user
        const createData: CreateUserRequest = {
          email: formData.email,
          role: formData.role,
        };
        
        const result = await UserService.createUser(createData);
        
        if (result.success) {
          showToast('success', 'User created successfully');
          handleCloseForm();
          loadUsers();
        } else {
          showToast('error', result.error);
        }
      }
    } catch (error) {
      showToast('error', 'An unexpected error occurred');
      console.error('Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete user "${user.email}"?`)) {
      return;
    }
    
    try {
      const result = await UserService.deleteUser(user.id);
      
      if (result.success) {
        showToast('success', 'User deleted successfully');
        loadUsers();
      } else {
        showToast('error', result.error);
      }
    } catch (error) {
      showToast('error', 'Failed to delete user');
      console.error('Error deleting user:', error);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <TelemetryErrorBoundary>
      <section className="s-panel">
        <div className="s-panelCard">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <p className="s-panelT">User Management</p>
              <p style={{ color: 'var(--s-muted)', fontSize: '14px', marginTop: '4px' }}>
                Manage user accounts and role assignments
              </p>
            </div>
            <button
              onClick={handleCreateUser}
              className="btn btn-primary"
              style={{
                padding: '8px 16px',
                backgroundColor: 'var(--s-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Add User
            </button>
          </div>

          {/* Search and Filter */}
          <form onSubmit={handleSearch} style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--s-muted)' }}>
                  Search Users
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by email..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--s-border)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--s-bg)',
                    color: 'var(--s-text)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--s-muted)' }}>
                  Filter by Role
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--s-border)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--s-bg)',
                    color: 'var(--s-text)',
                    fontSize: '14px',
                    minWidth: '120px',
                  }}
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="STAFF">Staff</option>
                </select>
              </div>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--s-secondary)',
                  color: 'var(--s-text)',
                  border: '1px solid var(--s-border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Search
              </button>
            </div>
          </form>

          {/* Users Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--s-muted)' }}>
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--s-muted)' }}>
              No users found
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--s-border)' }}>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', fontWeight: '500', color: 'var(--s-muted)' }}>
                        Email
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', fontWeight: '500', color: 'var(--s-muted)' }}>
                        Role
                      </th>
                      <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', fontWeight: '500', color: 'var(--s-muted)' }}>
                        Created
                      </th>
                      <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: '14px', fontWeight: '500', color: 'var(--s-muted)' }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} style={{ borderBottom: '1px solid var(--s-border)' }}>
                        <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                          {user.email}
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px' }}>
                          <span
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                              backgroundColor: user.role === 'ADMIN' ? 'var(--s-danger-bg)' : 
                                             user.role === 'MANAGER' ? 'var(--s-warning-bg)' : 'var(--s-info-bg)',
                              color: user.role === 'ADMIN' ? 'var(--s-danger)' : 
                                     user.role === 'MANAGER' ? 'var(--s-warning)' : 'var(--s-info)',
                            }}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td style={{ padding: '12px 8px', fontSize: '14px', color: 'var(--s-muted)' }}>
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleEditUser(user)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: 'transparent',
                                color: 'var(--s-primary)',
                                border: '1px solid var(--s-primary)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: 'transparent',
                                color: 'var(--s-danger)',
                                border: '1px solid var(--s-danger)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                  <p style={{ fontSize: '14px', color: 'var(--s-muted)' }}>
                    Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, total)} of {total} users
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: currentPage === 1 ? 'var(--s-bg-secondary)' : 'var(--s-secondary)',
                        color: currentPage === 1 ? 'var(--s-muted)' : 'var(--s-text)',
                        border: '1px solid var(--s-border)',
                        borderRadius: '6px',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Previous
                    </button>
                    <span style={{ padding: '8px 12px', fontSize: '14px', color: 'var(--s-muted)' }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: currentPage === totalPages ? 'var(--s-bg-secondary)' : 'var(--s-secondary)',
                        color: currentPage === totalPages ? 'var(--s-muted)' : 'var(--s-text)',
                        border: '1px solid var(--s-border)',
                        borderRadius: '6px',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Create/Edit User Modal */}
      {showCreateForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseForm();
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--s-bg)',
              border: '1px solid var(--s-border)',
              borderRadius: '8px',
              padding: '24px',
              width: '100%',
              maxWidth: '500px',
              margin: '20px',
            }}
          >
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
              {editingUser ? 'Edit User' : 'Create New User'}
            </h3>

            <form onSubmit={handleSubmitForm}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--s-muted)' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${formErrors.email ? 'var(--s-danger)' : 'var(--s-border)'}`,
                    borderRadius: '6px',
                    backgroundColor: 'var(--s-bg)',
                    color: 'var(--s-text)',
                    fontSize: '14px',
                  }}
                  placeholder="user@example.com"
                />
                {formErrors.email && (
                  <p style={{ color: 'var(--s-danger)', fontSize: '12px', marginTop: '4px' }}>
                    {formErrors.email}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--s-muted)' }}>
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${formErrors.role ? 'var(--s-danger)' : 'var(--s-border)'}`,
                    borderRadius: '6px',
                    backgroundColor: 'var(--s-bg)',
                    color: 'var(--s-text)',
                    fontSize: '14px',
                  }}
                >
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
                {formErrors.role && (
                  <p style={{ color: 'var(--s-danger)', fontSize: '12px', marginTop: '4px' }}>
                    {formErrors.role}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCloseForm}
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    color: 'var(--s-text)',
                    border: '1px solid var(--s-border)',
                    borderRadius: '6px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: submitting ? 'var(--s-bg-secondary)' : 'var(--s-primary)',
                    color: submitting ? 'var(--s-muted)' : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {submitting ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TelemetryErrorBoundary>
  );
}