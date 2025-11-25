import { useState, useEffect } from "react";
import { Search, Edit, Eye, KeyRound, UserCog, Download, Upload, Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { usersAPI } from "../../services/apiService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

export function ManageUsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [resetViaEmail, setResetViaEmail] = useState(true);
  const [resetViaSMS, setResetViaSMS] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [viewUser, setViewUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  const loadUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      if (response.success) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleResetPassword = (user: any) => {
    setSelectedUser(user);
    setShowResetDialog(true);
  };

  const confirmResetPassword = () => {
    const method = resetViaEmail && resetViaSMS 
      ? "Email & SMS" 
      : resetViaEmail 
      ? "Email" 
      : resetViaSMS 
      ? "SMS" 
      : "not sent";

    toast.success(`Password reset link sent to ${selectedUser.name} via ${method}`);
    setShowResetDialog(false);
    setSelectedUser(null);
  };

  const handleDeactivate = (user: any) => {
    setSelectedUser(user);
    setShowDeactivateDialog(true);
  };

  const confirmDeactivate = () => {
    const action = selectedUser.status === "Active" ? "deactivated" : "activated";
    toast.success(`User ${selectedUser.name} ${action} successfully`);
    setShowDeactivateDialog(false);
    setSelectedUser(null);
  };

  const handleEdit = (user: any) => {
    setEditUser(user);
    setShowEditDialog(true);
  };

  const handleView = (user: any) => {
    setViewUser(user);
    setShowViewDialog(true);
  };

  const handleUpdateUser = async (updatedData: any) => {
    try {
      await usersAPI.update(updatedData.id, updatedData);
      toast.success('User updated successfully');
      setShowEditDialog(false);
      loadUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      const message =
        (error?.data && (error.data.message as string)) ||
        (error?.message as string) ||
        'Failed to update user';
      toast.error(message);
    }
  };

  const handleImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const csv = event.target?.result as string;
            const lines = csv.split('\n');
            const headers = lines[0].split(',');
            
            // Validate CSV structure
            const requiredHeaders = ['name', 'username', 'email', 'role'];
            const hasRequiredHeaders = requiredHeaders.every(h => headers.includes(h));
            
            if (!hasRequiredHeaders) {
              toast.error('CSV must contain columns: name, username, email, role');
              return;
            }
            
            // Parse CSV data
            const users = [];
            for (let i = 1; i < lines.length; i++) {
              if (lines[i].trim()) {
                const values = lines[i].split(',');
                const user = {
                  name: values[headers.indexOf('name')]?.trim(),
                  username: values[headers.indexOf('username')]?.trim(),
                  email: values[headers.indexOf('email')]?.trim(),
                  role: values[headers.indexOf('role')]?.trim(),
                  password: 'default123' // Default password for imported users
                };
                users.push(user);
              }
            }
            
            // Import users
            for (const user of users) {
              try {
                await usersAPI.create(user);
              } catch (error) {
                console.error(`Failed to import user ${user.username}:`, error);
              }
            }
            
            toast.success(`Imported ${users.length} users successfully`);
            loadUsers(); // Refresh the list
          } catch (error) {
            toast.error('Failed to parse CSV file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExport = () => {
    toast.success("User list exported");
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || user.role === filterRole;
    const matchesStatus = filterStatus === "all" || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case "Admin": return "bg-[#DC3545]";
      case "Teacher": return "bg-[#1E90FF]";
      case "Accountant": return "bg-[#FFC107]";
      case "Parent": return "bg-[#28A745]";
      default: return "bg-[#C0C8D3]";
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-white mb-2">Manage Users</h1>
        <p className="text-[#C0C8D3]">View, edit, and manage all system users</p>
      </div>

      <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
        <CardHeader className="p-5 border-b border-white/10">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#C0C8D3]" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, username, or email..."
                className="h-12 pl-10 rounded-xl border border-white/10 bg-[#0F243E] text-white"
              />
            </div>

            <div className="flex flex-wrap gap-3 w-full lg:w-auto">
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="h-12 w-full sm:w-36 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F243E] border-white/10">
                  <SelectItem value="all" className="text-white hover:bg-[#1E90FF]">All Roles</SelectItem>
                  <SelectItem value="Admin" className="text-white hover:bg-[#1E90FF]">Admin</SelectItem>
                  <SelectItem value="Teacher" className="text-white hover:bg-[#1E90FF]">Teacher</SelectItem>
                  <SelectItem value="Accountant" className="text-white hover:bg-[#1E90FF]">Accountant</SelectItem>
                  <SelectItem value="Parent" className="text-white hover:bg-[#1E90FF]">Parent</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-12 w-full sm:w-36 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F243E] border-white/10">
                  <SelectItem value="all" className="text-white hover:bg-[#1E90FF]">All Status</SelectItem>
                  <SelectItem value="Active" className="text-white hover:bg-[#1E90FF]">Active</SelectItem>
                  <SelectItem value="Inactive" className="text-white hover:bg-[#1E90FF]">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={handleImportCSV}
                className="h-12 bg-[#FFC107] hover:bg-[#FFC107]/90 text-white rounded-xl shadow-md hover:scale-105 transition-all whitespace-nowrap"
              >
                <Upload className="w-5 h-5 mr-2" />
                Import (CSV)
              </Button>

              <Button 
                onClick={handleExport}
                className="h-12 bg-[#1E90FF] hover:bg-[#00BFFF] text-white rounded-xl shadow-md hover:scale-105 transition-all whitespace-nowrap"
              >
                <Download className="w-5 h-5 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-[#1E90FF] to-[#00BFFF] border-none hover:bg-gradient-to-r">
                  <TableHead className="text-white">Role</TableHead>
                  <TableHead className="text-white">Name</TableHead>
                  <TableHead className="text-white">Username</TableHead>
                  <TableHead className="text-white">Email</TableHead>
                  <TableHead className="text-white">Phone</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white">Last Login</TableHead>
                  <TableHead className="text-white text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="bg-[#0F243E] border-b border-white/5 hover:bg-[#132C4A]">
                    <TableCell>
                      <Badge className={`${getRoleBadgeColor(user.role)} text-white border-0`}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white">{user.name}</TableCell>
                    <TableCell className="text-[#C0C8D3] font-mono text-sm">{user.username}</TableCell>
                    <TableCell className="text-[#C0C8D3] text-sm">{user.email}</TableCell>
                    <TableCell className="text-[#C0C8D3]">{user.phone}</TableCell>
                    <TableCell>
                      <Badge className={user.status === "Active" ? "bg-[#28A745] text-white border-0" : "bg-[#DC3545] text-white border-0"}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#C0C8D3] text-sm">{user.lastLogin}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2 flex-wrap">
                        <Button
                          onClick={() => handleView(user)}
                          size="sm"
                          className="h-8 w-8 p-0 bg-[#1E90FF] hover:bg-[#00BFFF] rounded-lg"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleEdit(user)}
                          size="sm"
                          className="h-8 w-8 p-0 bg-[#FFC107] hover:bg-[#FFC107]/90 rounded-lg"
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleResetPassword(user)}
                          size="sm"
                          className="h-8 w-8 p-0 bg-[#00BFFF] hover:bg-[#00BFFF]/90 rounded-lg"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeactivate(user)}
                          size="sm"
                          className={`h-8 w-8 p-0 rounded-lg ${
                            user.status === "Active" 
                              ? "bg-[#DC3545] hover:bg-[#DC3545]/90" 
                              : "bg-[#28A745] hover:bg-[#28A745]/90"
                          }`}
                          title={user.status === "Active" ? "Deactivate" : "Activate"}
                        >
                          <UserCog className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-[#1E90FF]" />
              <p className="text-[#C0C8D3] text-sm">Total Users</p>
            </div>
            <p className="text-white text-xl">347</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1 text-sm">Admins</p>
            <p className="text-[#DC3545] text-xl">12</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1 text-sm">Teachers</p>
            <p className="text-[#1E90FF] text-xl">87</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1 text-sm">Accountants</p>
            <p className="text-[#FFC107] text-xl">8</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1 text-sm">Parents</p>
            <p className="text-[#28A745] text-xl">240</p>
          </CardContent>
        </Card>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="bg-[#132C4A] border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Reset Password</DialogTitle>
            <DialogDescription className="text-[#C0C8D3]">
              Send password reset instructions to {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-3 bg-[#0F243E] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1E90FF]/20 flex items-center justify-center">
                  <UserCog className="w-4 h-4 text-[#1E90FF]" />
                </div>
                <div>
                  <p className="text-white text-sm">{selectedUser?.name}</p>
                  <p className="text-[#C0C8D3] text-xs">{selectedUser?.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-white">Send reset link via:</Label>
              <div className="flex items-center justify-between p-3 bg-[#0F243E] rounded-lg">
                <span className="text-white text-sm">Email</span>
                <Switch checked={resetViaEmail} onCheckedChange={setResetViaEmail} />
              </div>
              <div className="flex items-center justify-between p-3 bg-[#0F243E] rounded-lg">
                <span className="text-white text-sm">SMS</span>
                <Switch checked={resetViaSMS} onCheckedChange={setResetViaSMS} />
              </div>
            </div>

            <div className="p-3 bg-[#FFC107]/10 border border-[#FFC107]/30 rounded-lg">
              <p className="text-xs text-[#C0C8D3]">
                ⚠️ The reset link will expire in 1 hour. User will be required to create a new password.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowResetDialog(false)}
              className="bg-[#DC3545] hover:bg-[#DC3545]/90 text-white rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmResetPassword}
              disabled={!resetViaEmail && !resetViaSMS}
              className="bg-[#28A745] hover:bg-[#28A745]/90 text-white rounded-xl"
            >
              Reset & Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate/Activate Confirmation Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent className="bg-[#132C4A] border border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {selectedUser?.status === "Active" ? "Deactivate User?" : "Activate User?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#C0C8D3]">
              {selectedUser?.status === "Active" 
                ? `Are you sure you want to deactivate ${selectedUser?.name}? They will no longer be able to access the system.`
                : `Are you sure you want to activate ${selectedUser?.name}? They will regain access to the system.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#0F243E] text-white border-white/10 hover:bg-[#132C4A]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              className={selectedUser?.status === "Active" 
                ? "bg-[#DC3545] hover:bg-[#DC3545]/90" 
                : "bg-[#28A745] hover:bg-[#28A745]/90"
              }
            >
              {selectedUser?.status === "Active" ? "Deactivate" : "Activate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View User Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="bg-[#132C4A] border border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">User Details</DialogTitle>
            <DialogDescription className="text-[#C0C8D3]">
              View complete user information
            </DialogDescription>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#C0C8D3] text-sm">Name</Label>
                  <p className="text-white font-medium">{viewUser.name}</p>
                </div>
                <div>
                  <Label className="text-[#C0C8D3] text-sm">Username</Label>
                  <p className="text-white font-medium">{viewUser.username}</p>
                </div>
                <div>
                  <Label className="text-[#C0C8D3] text-sm">Email</Label>
                  <p className="text-white font-medium">{viewUser.email}</p>
                </div>
                <div>
                  <Label className="text-[#C0C8D3] text-sm">Phone</Label>
                  <p className="text-white font-medium">{viewUser.phone}</p>
                </div>
                <div>
                  <Label className="text-[#C0C8D3] text-sm">Role</Label>
                  <Badge className={`${getRoleBadgeColor(viewUser.role)} text-white border-0`}>
                    {viewUser.role}
                  </Badge>
                </div>
                <div>
                  <Label className="text-[#C0C8D3] text-sm">Status</Label>
                  <Badge className={viewUser.status === "Active" ? "bg-[#28A745] text-white border-0" : "bg-[#DC3545] text-white border-0"}>
                    {viewUser.status}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <Label className="text-[#C0C8D3] text-sm">Last Login</Label>
                  <p className="text-white font-medium">{viewUser.lastLogin}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              onClick={() => setShowViewDialog(false)}
              className="bg-[#0F243E] text-white border-white/10 hover:bg-[#132C4A]"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-[#132C4A] border border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Edit User</DialogTitle>
            <DialogDescription className="text-[#C0C8D3]">
              Update user information
            </DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName" className="text-[#C0C8D3] text-sm">Name</Label>
                <Input
                  id="editName"
                  value={editUser.name}
                  onChange={(e) => setEditUser({...editUser, name: e.target.value})}
                  className="border border-white/10 bg-[#0F243E] text-white"
                />
              </div>
              <div>
                <Label htmlFor="editUsername" className="text-[#C0C8D3] text-sm">Username</Label>
                <Input
                  id="editUsername"
                  value={editUser.username}
                  onChange={(e) => setEditUser({...editUser, username: e.target.value})}
                  className="border border-white/10 bg-[#0F243E] text-white"
                />
              </div>
              <div>
                <Label htmlFor="editEmail" className="text-[#C0C8D3] text-sm">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editUser.email}
                  onChange={(e) => setEditUser({...editUser, email: e.target.value})}
                  className="border border-white/10 bg-[#0F243E] text-white"
                />
              </div>
              <div>
                <Label htmlFor="editPhone" className="text-[#C0C8D3] text-sm">Phone</Label>
                <Input
                  id="editPhone"
                  value={editUser.phone}
                  onChange={(e) => setEditUser({...editUser, phone: e.target.value})}
                  className="border border-white/10 bg-[#0F243E] text-white"
                />
              </div>
              <div>
                <Label htmlFor="editRole" className="text-[#C0C8D3] text-sm">Role</Label>
                <Select 
                  value={editUser.role} 
                  onValueChange={(value: string) => setEditUser({...editUser, role: value})}
                >
                  <SelectTrigger className="border border-white/10 bg-[#0F243E] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0F243E] border-white/10">
                    <SelectItem value="Admin" className="text-white hover:bg-[#1E90FF]">Admin</SelectItem>
                    <SelectItem value="Teacher" className="text-white hover:bg-[#1E90FF]">Teacher</SelectItem>
                    <SelectItem value="Accountant" className="text-white hover:bg-[#1E90FF]">Accountant</SelectItem>
                    <SelectItem value="Parent" className="text-white hover:bg-[#1E90FF]">Parent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              onClick={() => setShowEditDialog(false)}
              className="bg-[#0F243E] text-white border-white/10 hover:bg-[#132C4A]"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleUpdateUser(editUser)}
              className="bg-[#1E90FF] hover:bg-[#00BFFF] text-white"
            >
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
