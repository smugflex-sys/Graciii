import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Power, 
  Users, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { sessionsAPI, Session } from '@/services/apiService';

interface SessionFormData {
  name: string;
  start_date: string;
  end_date: string;
  status: 'Active' | 'Inactive';
  prefix?: string;
  is_active: boolean;
}

export default function SessionManagementPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [formData, setFormData] = useState<SessionFormData>({
    name: '',
    start_date: '',
    end_date: '',
    status: 'Active',
    prefix: '',
    is_active: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    total_sessions: 0,
    active_sessions: 0,
    inactive_sessions: 0
  });

  // Fetch sessions and stats
  useEffect(() => {
    fetchSessions();
    fetchStats();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await sessionsAPI.getAll();
      const sessionList = Array.isArray(response) ? response : (response as any)?.data || [];
      setSessions(sessionList);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await sessionsAPI.getStats();
      const data = (response as any)?.data || response;
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      start_date: '',
      end_date: '',
      status: 'active',
      prefix: '',
      is_active: false
    });
    setEditingSession(null);
  };

  const openModal = (session?: Session) => {
    if (session) {
      setEditingSession(session);
      setFormData({
        name: session.name,
        start_date: session.start_date,
        end_date: session.end_date,
        status: session.status,
        prefix: session.prefix || '',
        is_active: session.is_active
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name.trim()) {
      toast.error('Session name is required');
      return;
    }
    
    if (!formData.start_date || !formData.end_date) {
      toast.error('Start and end dates are required');
      return;
    }
    
    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      toast.error('End date must be after start date');
      return;
    }

    // Validate session name format (YYYY/YYYY)
    if (!/^[0-9]{4}\/[0-9]{4}$/.test(formData.name)) {
      toast.error('Session name must be in format YYYY/YYYY (e.g., 2024/2025)');
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingSession) {
        await sessionsAPI.update(editingSession.id, formData);
        toast.success('Session updated successfully');
      } else {
        await sessionsAPI.create(formData);
        toast.success('Session created successfully');
      }
      
      await fetchSessions();
      await fetchStats();
      closeModal();
    } catch (error: any) {
      console.error('Error saving session:', error);
      toast.error(error.message || 'Failed to save session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (session: Session) => {
    if (!confirm(`Are you sure you want to delete session "${session.name}"?`)) {
      return;
    }

    if (session.is_active) {
      toast.error('Cannot delete active session');
      return;
    }

    try {
      await sessionsAPI.delete(session.id);
      toast.success('Session deleted successfully');
      await fetchSessions();
      await fetchStats();
    } catch (error: any) {
      console.error('Error deleting session:', error);
      toast.error(error.message || 'Failed to delete session');
    }
  };

  const handleSetActive = async (session: Session) => {
    if (session.is_active) {
      return; // Already active
    }

    try {
      await sessionsAPI.setActive(session.id);
      toast.success(`Session "${session.name}" set as active`);
      await fetchSessions();
      await fetchStats();
    } catch (error: any) {
      console.error('Error setting active session:', error);
      toast.error(error.message || 'Failed to set active session');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session Management</h1>
          <p className="text-gray-600">Manage academic sessions and their terms</p>
        </div>
        <Button onClick={() => openModal()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Session
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_sessions}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-green-600">{stats.active_sessions}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive Sessions</p>
                <p className="text-2xl font-bold text-gray-500">{stats.inactive_sessions}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>All Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No sessions found</p>
              <Button onClick={() => openModal()} className="mt-4">
                Create First Session
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{session.name}</h3>
                        <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                          {session.status}
                        </Badge>
                        {session.is_active && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Active
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(session.start_date)} - {formatDate(session.end_date)}
                        </div>
                        {session.prefix && (
                          <div>Prefix: {session.prefix}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!session.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetActive(session)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Power className="w-4 h-4" />
                          Set Active
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openModal(session)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      {!session.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(session)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingSession ? 'Edit Session' : 'Create New Session'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Session Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., 2024/2025"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: YYYY/YYYY</p>
                </div>

                <div>
                  <Label htmlFor="prefix">Prefix (Optional)</Label>
                  <Input
                    id="prefix"
                    value={formData.prefix}
                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                    placeholder="e.g., 2024/25"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="end_date">End Date *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? 'Saving...' : (editingSession ? 'Update' : 'Create')}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
