import { useState } from 'react';
import { Search, Bell, Trash2, Eye, Calendar, Users, MessageSquare, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'announcement' | 'alert' | 'reminder' | 'update';
  recipient: string;
  recipientCount: number;
  sentBy: string;
  sentDate: string;
  status: 'sent' | 'draft' | 'scheduled';
  readCount: number;
}

export function NotificationArchivesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Mock data
  const notifications: Notification[] = [
    {
      id: 'NOT001',
      title: 'Mid-Term Examination Schedule Released',
      message: 'The mid-term examination for all classes will commence on February 10, 2025. Students are advised to prepare adequately. Examination timetables have been sent to class teachers.',
      type: 'announcement',
      recipient: 'All Students & Parents',
      recipientCount: 450,
      sentBy: 'Admin Office',
      sentDate: '2025-01-20',
      status: 'sent',
      readCount: 380
    },
    {
      id: 'NOT002',
      title: 'Fee Payment Reminder - Final Notice',
      message: 'This is a final reminder to complete your outstanding fee payments before January 31, 2025. Late payments will attract a 5% penalty.',
      type: 'reminder',
      recipient: 'Parents with Outstanding Fees',
      recipientCount: 45,
      sentBy: 'Accounts Department',
      sentDate: '2025-01-18',
      status: 'sent',
      readCount: 42
    },
    {
      id: 'NOT003',
      title: 'Sports Day Announcement',
      message: 'The annual sports day has been scheduled for February 28, 2025. All students are required to participate. Parent attendance is highly encouraged.',
      type: 'announcement',
      recipient: 'All Students & Parents',
      recipientCount: 450,
      sentBy: 'Admin Office',
      sentDate: '2025-01-15',
      status: 'sent',
      readCount: 425
    },
    {
      id: 'NOT004',
      title: 'System Maintenance Notice',
      message: 'The school management system will undergo scheduled maintenance on January 25, 2025, from 10 PM to 2 AM. Services will be temporarily unavailable.',
      type: 'alert',
      recipient: 'All Staff',
      recipientCount: 50,
      sentBy: 'IT Department',
      sentDate: '2025-01-14',
      status: 'sent',
      readCount: 50
    },
    {
      id: 'NOT005',
      title: 'Parent-Teacher Meeting - Term 2',
      message: 'Parents are invited to meet with class teachers on February 5, 2025, to discuss student progress. Please confirm your attendance.',
      type: 'announcement',
      recipient: 'All Parents',
      recipientCount: 300,
      sentBy: 'Admin Office',
      sentDate: '2025-01-12',
      status: 'sent',
      readCount: 245
    },
    {
      id: 'NOT006',
      title: 'New Teacher Orientation',
      message: 'All newly recruited teachers are to report for orientation on February 1, 2025, at 9:00 AM in the staff room.',
      type: 'update',
      recipient: 'New Teaching Staff',
      recipientCount: 5,
      sentBy: 'HR Department',
      sentDate: '2025-01-10',
      status: 'sent',
      readCount: 5
    },
    {
      id: 'NOT007',
      title: 'Uniform Policy Update',
      message: 'Please note the updated uniform policy effective from next term. All students must comply with the new guidelines.',
      type: 'update',
      recipient: 'All Students & Parents',
      recipientCount: 450,
      sentBy: 'Admin Office',
      sentDate: '2025-01-08',
      status: 'sent',
      readCount: 410
    },
    {
      id: 'NOT008',
      title: 'Holiday Assignment Submission',
      message: 'All holiday assignments are due for submission on the first day of resumption. Late submissions will not be accepted.',
      type: 'reminder',
      recipient: 'All Students',
      recipientCount: 450,
      sentBy: 'Academic Department',
      sentDate: '2024-12-20',
      status: 'sent',
      readCount: 450
    },
  ];

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = 
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.recipient.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || notification.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || notification.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeBadge = (type: Notification['type']) => {
    switch (type) {
      case 'announcement':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300"><Bell className="w-3 h-3 mr-1" />Announcement</Badge>;
      case 'alert':
        return <Badge className="bg-red-100 text-red-800 border-red-300"><AlertCircle className="w-3 h-3 mr-1" />Alert</Badge>;
      case 'reminder':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300"><Calendar className="w-3 h-3 mr-1" />Reminder</Badge>;
      case 'update':
        return <Badge className="bg-green-100 text-green-800 border-green-300"><MessageSquare className="w-3 h-3 mr-1" />Update</Badge>;
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map(n => n.id));
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} notification(s)?`)) {
      setSelectedIds([]);
      // In a real app, this would delete the notifications
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#0A2540] mb-2">Notification Archives</h1>
          <p className="text-gray-600">View and manage all sent notifications</p>
        </div>
        {selectedIds.length > 0 && (
          <Button 
            onClick={handleBulkDelete}
            variant="destructive"
            className="rounded-xl"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete {selectedIds.length} Selected
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Sent</p>
                <p className="text-[#0A2540]">{notifications.filter(n => n.status === 'sent').length}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <Bell className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Announcements</p>
                <p className="text-[#0A2540]">{notifications.filter(n => n.type === 'announcement').length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Alerts</p>
                <p className="text-[#0A2540]">{notifications.filter(n => n.type === 'alert').length}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Recipients</p>
                <p className="text-[#0A2540]">{notifications.reduce((sum, n) => sum + n.recipientCount, 0)}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-xl">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-[#0A2540]/10">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-[#0A2540]/20 focus:border-[#FFD700] rounded-xl"
              />
            </div>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="border-[#0A2540]/20 rounded-xl">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="alert">Alert</SelectItem>
                <SelectItem value="reminder">Reminder</SelectItem>
                <SelectItem value="update">Update</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-[#0A2540]/20 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card className="border-[#0A2540]/10">
        <CardHeader className="border-b border-[#0A2540]/10 bg-[#0A2540]/5">
          <CardTitle className="text-[#0A2540]">Archived Notifications ({filteredNotifications.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#0A2540]/5">
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedIds.length === filteredNotifications.length && filteredNotifications.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-[#0A2540]">Title</TableHead>
                  <TableHead className="text-[#0A2540]">Type</TableHead>
                  <TableHead className="text-[#0A2540]">Recipient</TableHead>
                  <TableHead className="text-[#0A2540]">Sent By</TableHead>
                  <TableHead className="text-[#0A2540]">Date</TableHead>
                  <TableHead className="text-[#0A2540]">Read Rate</TableHead>
                  <TableHead className="text-[#0A2540]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotifications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No notifications found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNotifications.map((notification) => (
                    <TableRow key={notification.id} className="hover:bg-[#0A2540]/5">
                      <TableCell>
                        <Checkbox 
                          checked={selectedIds.includes(notification.id)}
                          onCheckedChange={() => toggleSelection(notification.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-[#0A2540]">{notification.title}</p>
                          <p className="text-sm text-gray-500 line-clamp-1">{notification.message}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(notification.type)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-[#0A2540]">{notification.recipient}</p>
                          <p className="text-sm text-gray-500">{notification.recipientCount} recipients</p>
                        </div>
                      </TableCell>
                      <TableCell>{notification.sentBy}</TableCell>
                      <TableCell>{new Date(notification.sentDate).toLocaleDateString('en-GB')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-[#FFD700] h-2 rounded-full" 
                              style={{ width: `${(notification.readCount / notification.recipientCount) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {Math.round((notification.readCount / notification.recipientCount) * 100)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedNotification(notification)}
                          className="text-[#0A2540] hover:text-[#FFD700] hover:bg-[#FFD700]/10 rounded-xl"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Notification Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent className="max-w-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">{selectedNotification?.title}</DialogTitle>
            <DialogDescription>
              Sent to {selectedNotification?.recipient} on {selectedNotification && new Date(selectedNotification.sentDate).toLocaleDateString('en-GB')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              {selectedNotification && getTypeBadge(selectedNotification.type)}
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-gray-700 whitespace-pre-wrap">{selectedNotification?.message}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Sent By:</p>
                <p className="text-[#0A2540]">{selectedNotification?.sentBy}</p>
              </div>
              <div>
                <p className="text-gray-600">Recipients:</p>
                <p className="text-[#0A2540]">{selectedNotification?.recipientCount}</p>
              </div>
              <div>
                <p className="text-gray-600">Read Count:</p>
                <p className="text-[#0A2540]">{selectedNotification?.readCount}</p>
              </div>
              <div>
                <p className="text-gray-600">Read Rate:</p>
                <p className="text-[#0A2540]">
                  {selectedNotification && Math.round((selectedNotification.readCount / selectedNotification.recipientCount) * 100)}%
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
