import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Power, 
  Users, 
  AlertCircle,
  CheckCircle,
  Clock,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import { termsAPI, sessionsAPI, Term, Session } from '@/services/apiService';

interface TermFormData {
  name: string;
  session_id: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_current: boolean;
}

export default function TermManagementPage() {
  const [terms, setTerms] = useState<Term[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [formData, setFormData] = useState<TermFormData>({
    name: '',
    session_id: 0,
    start_date: '',
    end_date: '',
    is_active: false,
    is_current: false
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchSessions();
    fetchTerms();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await sessionsAPI.getAll();
      const sessionList = Array.isArray(response) ? response : (response as any)?.data || [];
      setSessions(sessionList);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
    }
  };

  const fetchTerms = async () => {
    try {
      setLoading(true);
      const response = await termsAPI.getAll(selectedSession ? { session_id: selectedSession } : undefined);
      const termList = Array.isArray(response) ? response : (response as any)?.data || [];
      setTerms(termList);
    } catch (error) {
      console.error('Error fetching terms:', error);
      toast.error('Failed to load terms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTerms();
  }, [selectedSession]);

  const resetForm = () => {
    setFormData({
      name: '',
      session_id: 0,
      start_date: '',
      end_date: '',
      is_active: false,
      is_current: false
    });
    setEditingTerm(null);
  };

  const openModal = (term?: Term) => {
    if (term) {
      setEditingTerm(term);
      setFormData({
        name: term.name,
        session_id: term.session_id,
        start_date: term.start_date,
        end_date: term.end_date,
        is_active: term.is_active,
        is_current: term.is_current
      });
    } else {
      resetForm();
      if (selectedSession) {
        setFormData(prev => ({ ...prev, session_id: selectedSession }));
      }
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
      toast.error('Term name is required');
      return;
    }
    
    if (!formData.session_id) {
      toast.error('Please select a session');
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

    // Validate term name
    const validTermNames = ['First Term', 'Second Term', 'Third Term'];
    if (!validTermNames.includes(formData.name)) {
      toast.error('Term name must be one of: First Term, Second Term, Third Term');
      return;
    }

    try {
      setSubmitting(true);
      
      if (editingTerm) {
        await termsAPI.update(editingTerm.id, formData);
        toast.success('Term updated successfully');
      } else {
        await termsAPI.create(formData);
        toast.success('Term created successfully');
      }
      
      await fetchTerms();
      closeModal();
    } catch (error: any) {
      console.error('Error saving term:', error);
      toast.error(error.message || 'Failed to save term');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (term: Term) => {
    if (!confirm(`Are you sure you want to delete term "${term.name}"?`)) {
      return;
    }

    if (term.is_active) {
      toast.error('Cannot delete active term');
      return;
    }

    try {
      await termsAPI.delete(term.id);
      toast.success('Term deleted successfully');
      await fetchTerms();
    } catch (error: any) {
      console.error('Error deleting term:', error);
      toast.error(error.message || 'Failed to delete term');
    }
  };

  const handleSetActive = async (term: Term) => {
    if (term.is_active) {
      return; // Already active
    }

    try {
      await termsAPI.setActive(term.id);
      toast.success(`Term "${term.name}" set as active`);
      await fetchTerms();
    } catch (error: any) {
      console.error('Error setting active term:', error);
      toast.error(error.message || 'Failed to set active term');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getSessionName = (sessionId: number) => {
    const session = sessions.find(s => s.id === sessionId);
    return session?.name || 'Unknown Session';
  };

  const activeTermsCount = terms.filter(t => t.is_active).length;
  const currentTermsCount = terms.filter(t => t.is_current).length;

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
          <h1 className="text-2xl font-bold text-gray-900">Term Management</h1>
          <p className="text-gray-600">Manage academic terms within sessions</p>
        </div>
        <Button onClick={() => openModal()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Term
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Terms</p>
                <p className="text-2xl font-bold text-gray-900">{terms.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Terms</p>
                <p className="text-2xl font-bold text-green-600">{activeTermsCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Terms</p>
                <p className="text-2xl font-bold text-blue-600">{currentTermsCount}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
              </div>
              <Users className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="session-filter">Filter by Session:</Label>
            <Select value={selectedSession?.toString() || ''} onValueChange={(value) => setSelectedSession(value ? Number(value) : null)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="All Sessions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Sessions</SelectItem>
                {sessions.map((session) => (
                  <SelectItem key={session.id} value={session.id.toString()}>
                    {session.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Terms List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Terms {selectedSession && `- ${getSessionName(selectedSession)}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {terms.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {selectedSession ? 'No terms found for this session' : 'No terms found'}
              </p>
              <Button onClick={() => openModal()} className="mt-4">
                Create First Term
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {terms.map((term) => (
                <div key={term.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{term.name}</h3>
                        {term.is_active && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Active
                          </Badge>
                        )}
                        {term.is_current && (
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            Current
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(term.start_date)} - {formatDate(term.end_date)}
                        </div>
                        <div>
                          Session: {getSessionName(term.session_id)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!term.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetActive(term)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Power className="w-4 h-4" />
                          Set Active
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openModal(term)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      {!term.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(term)}
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
              <CardTitle>{editingTerm ? 'Edit Term' : 'Create New Term'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Term Name *</Label>
                  <Select value={formData.name} onValueChange={(value) => setFormData({ ...formData, name: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="First Term">First Term</SelectItem>
                      <SelectItem value="Second Term">Second Term</SelectItem>
                      <SelectItem value="Third Term">Third Term</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="session_id">Session *</Label>
                  <Select value={formData.session_id.toString()} onValueChange={(value) => setFormData({ ...formData, session_id: Number(value) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((session) => (
                        <SelectItem key={session.id} value={session.id.toString()}>
                          {session.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={submitting} className="flex-1">
                    {submitting ? 'Saving...' : (editingTerm ? 'Update' : 'Create')}
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
