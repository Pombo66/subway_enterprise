'use client';

import { useEffect, useState } from 'react';

interface StaffMember {
  id: string;
  role: string;
  assignedAt: string;
  User: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    active: boolean;
  };
}

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

export function StaffTab({ storeId }: { storeId: string }) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('STAFF');

  const fetchStaff = async () => {
    try {
      const response = await fetch(`/api/stores/${storeId}/staff`);
      if (response.ok) {
        const data = await response.json();
        setStaff(data);
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStaff(), fetchUsers()]);
      setLoading(false);
    };
    loadData();
  }, [storeId]);

  const handleAssignStaff = async () => {
    if (!selectedUserId) return;

    try {
      const response = await fetch(`/api/stores/${storeId}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, role: selectedRole })
      });

      if (response.ok) {
        await fetchStaff();
        setShowAddModal(false);
        setSelectedUserId('');
        setSelectedRole('STAFF');
      }
    } catch (err) {
      alert('Failed to assign staff');
    }
  };

  const handleRemoveStaff = async (userId: string) => {
    if (!confirm('Remove this staff member from the store?')) return;

    try {
      const response = await fetch(`/api/stores/${storeId}/staff/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchStaff();
      }
    } catch (err) {
      alert('Failed to remove staff');
    }
  };

  if (loading) {
    return <div style={{ padding: '24px' }}>Loading staff...</div>;
  }

  const assignedUserIds = new Set(staff.map(s => s.User.id));
  const availableUsers = allUsers.filter(u => !assignedUserIds.has(u.id));

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <p style={{ color: 'var(--s-muted)', fontSize: '14px' }}>
          {staff.length} staff member{staff.length !== 1 ? 's' : ''} assigned
        </p>
        <button onClick={() => setShowAddModal(true)} className="s-btn s-btn--primary">
          + Assign Staff
        </button>
      </div>

      <div className="s-panel">
        <div className="s-panelCard">
          <div style={{ overflowX: 'auto' }}>
            <table className="s-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>User Role</th>
                  <th>Store Role</th>
                  <th>Assigned</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--s-muted)' }}>
                      No staff assigned to this store
                    </td>
                  </tr>
                ) : (
                  staff.map(member => (
                    <tr key={member.id}>
                      <td>
                        {member.User.firstName} {member.User.lastName}
                      </td>
                      <td>{member.User.email}</td>
                      <td>
                        <span className={`badge role-${member.User.role.toLowerCase()}`}>
                          {member.User.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge role-${member.role.toLowerCase()}`}>
                          {member.role}
                        </span>
                      </td>
                      <td style={{ fontSize: '14px', color: 'var(--s-muted)' }}>
                        {new Date(member.assignedAt).toLocaleDateString()}
                      </td>
                      <td>
                        <span className={`badge status-${member.User.active ? 'open' : 'closed'}`}>
                          {member.User.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleRemoveStaff(member.User.id)}
                          className="s-btn s-btn--secondary"
                          style={{ fontSize: '12px', padding: '4px 12px' }}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--s-bg)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h2 style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '600' }}>
              Assign Staff Member
            </h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Select User
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="s-select"
                style={{ width: '100%' }}
              >
                <option value="">Choose a user...</option>
                {availableUsers.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                Store Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="s-select"
                style={{ width: '100%' }}
              >
                <option value="STAFF">Staff</option>
                <option value="MANAGER">Manager</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedUserId('');
                  setSelectedRole('STAFF');
                }}
                className="s-btn s-btn--secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignStaff}
                className="s-btn s-btn--primary"
                disabled={!selectedUserId}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
