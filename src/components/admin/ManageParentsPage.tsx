import { useState, useEffect } from "react";
import { Search, Edit, Trash2, Eye, UserPlus, Link as LinkIcon, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { usersAPI } from "../../services/apiService";

interface ManageParentsPageProps {
  onNavigateToLink?: () => void;
}

export function ManageParentsPage({ onNavigateToLink }: ManageParentsPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [parents, setParents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParent, setSelectedParent] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    status: "active"
  });

  // Load parents from API
  useEffect(() => {
    loadParents();
  }, []);

  const loadParents = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      if (response.success) {
        // Filter only parent users
        const parentUsers = response.data.filter((user: any) => user.role === 'parent');
        setParents(parentUsers);
      }
    } catch (error: any) {
      console.error('Error loading parents:', error);
      toast.error('Failed to load parents');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (parent: any) => {
    setSelectedParent(parent);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (parent: any) => {
    setSelectedParent(parent);
    setEditFormData({
      name: parent.name || "",
      email: parent.email || "",
      phone: parent.phone || "",
      status: parent.status || "active"
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedParent) return;

    try {
      const response = await usersAPI.update(selectedParent.id, editFormData);
      // Assuming the API returns the updated user object on success
      if (response) {
        toast.success('Parent updated successfully');
        setIsEditDialogOpen(false);
        loadParents(); // Reload the list
      }
    } catch (error: any) {
      console.error('Error updating parent:', error);
      const message =
        (error?.data && (error.data.message as string)) ||
        (error?.message as string) ||
        'Failed to update parent';
      toast.error(message);
    }
  };

  const handleDelete = async (parentId: number, parentName: string) => {
    if (!confirm(`Are you sure you want to delete ${parentName}? This action cannot be undone.`)) {
      return;
    }

    try {
      await usersAPI.delete(parentId);
      // Assuming delete is successful if no error is thrown
      toast.success('Parent deleted successfully');
      loadParents(); // Reload the list
    } catch (error: any) {
      console.error('Error deleting parent:', error);
      const message =
        (error?.data && (error.data.message as string)) ||
        (error?.message as string) ||
        'Failed to delete parent';
      toast.error(message);
    }
  };

  const handleLinkChild = () => {
    if (onNavigateToLink) {
      onNavigateToLink();
    } else {
      toast.info("Navigating to Link Student-Parent page");
    }
  };

  const filteredParents = parents.filter(parent =>
    parent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    parent.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-white mb-2">Manage Parents</h1>
        <p className="text-[#C0C8D3]">View, edit, and manage all registered parents/guardians</p>
      </div>

      <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
        <CardHeader className="p-5 border-b border-white/10">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#C0C8D3]" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or phone..."
                className="h-12 pl-10 rounded-xl border border-white/10 bg-[#0F243E] text-white"
              />
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <Button 
                onClick={handleLinkChild}
                className="h-12 bg-[#28A745] hover:bg-[#28A745]/90 text-white rounded-xl shadow-md hover:scale-105 transition-all whitespace-nowrap"
              >
                <LinkIcon className="w-5 h-5 mr-2" />
                Link Child(ren)
              </Button>
              
              <Button className="h-12 bg-[#1E90FF] hover:bg-[#00BFFF] text-white rounded-xl shadow-md hover:scale-105 transition-all whitespace-nowrap">
                <UserPlus className="w-5 h-5 mr-2" />
                Add New
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-[#1E90FF] to-[#00BFFF] border-none hover:bg-gradient-to-r">
                  <TableHead className="text-white">Parent/Guardian Name</TableHead>
                  <TableHead className="text-white">Email</TableHead>
                  <TableHead className="text-white">Phone</TableHead>
                  <TableHead className="text-white">Linked Children</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1E90FF]" />
                      <p className="text-[#C0C8D3] mt-2">Loading parents...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredParents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-[#C0C8D3]">No parents found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParents.map((parent) => (
                    <TableRow key={parent.id} className="bg-[#0F243E] border-b border-white/5 hover:bg-[#132C4A]">
                      <TableCell className="text-white">{parent.name}</TableCell>
                      <TableCell className="text-[#C0C8D3]">{parent.email}</TableCell>
                      <TableCell className="text-[#C0C8D3]">{parent.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge className="bg-[#1E90FF] text-white border-0">
                          0 children
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={parent.status === 'active' ? "bg-[#28A745] text-white border-0" : "bg-[#DC3545] text-white border-0"}>
                          {parent.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            onClick={() => handleView(parent)}
                            size="sm"
                            className="h-8 w-8 p-0 bg-[#1E90FF] hover:bg-[#00BFFF] rounded-lg"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={handleLinkChild}
                            size="sm"
                            className="h-8 w-8 p-0 bg-[#28A745] hover:bg-[#28A745]/90 rounded-lg"
                            title="Link to Child"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleEdit(parent)}
                            size="sm"
                            className="h-8 w-8 p-0 bg-[#FFC107] hover:bg-[#FFC107]/90 rounded-lg"
                            title="Edit Parent"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(parent.id, parent.name)}
                            size="sm"
                            className="h-8 w-8 p-0 bg-[#DC3545] hover:bg-[#DC3545]/90 rounded-lg"
                            title="Delete Parent"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1">Total Parents</p>
            <p className="text-white text-2xl font-bold">{parents.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1">Active</p>
            <p className="text-[#28A745] text-2xl font-bold">
              {parents.filter(p => p.status === 'active').length}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1">Inactive</p>
            <p className="text-[#DC3545] text-2xl font-bold">
              {parents.filter(p => p.status === 'inactive').length}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1">Search Results</p>
            <p className="text-[#1E90FF] text-2xl font-bold">{filteredParents.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* View Parent Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="bg-[#132C4A] text-white border-white/10">
          <DialogHeader>
            <DialogTitle>Parent Details</DialogTitle>
            <DialogDescription className="text-[#C0C8D3]">
              View complete information about this parent/guardian
            </DialogDescription>
          </DialogHeader>
          {selectedParent && (
            <div className="space-y-4">
              <div>
                <Label className="text-[#C0C8D3]">Name</Label>
                <p className="text-white font-medium">{selectedParent.name}</p>
              </div>
              <div>
                <Label className="text-[#C0C8D3]">Email</Label>
                <p className="text-white">{selectedParent.email}</p>
              </div>
              <div>
                <Label className="text-[#C0C8D3]">Phone</Label>
                <p className="text-white">{selectedParent.phone || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-[#C0C8D3]">Status</Label>
                <Badge className={selectedParent.status === 'active' ? "bg-[#28A745]" : "bg-[#DC3545]"}>
                  {selectedParent.status}
                </Badge>
              </div>
              <div>
                <Label className="text-[#C0C8D3]">Created</Label>
                <p className="text-white">{new Date(selectedParent.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Parent Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[#132C4A] text-white border-white/10">
          <DialogHeader>
            <DialogTitle>Edit Parent</DialogTitle>
            <DialogDescription className="text-[#C0C8D3]">
              Update parent/guardian information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="bg-[#0F243E] border-white/10 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="bg-[#0F243E] border-white/10 text-white"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                className="bg-[#0F243E] border-white/10 text-white"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="border-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                className="bg-[#1E90FF] hover:bg-[#00BFFF]"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
