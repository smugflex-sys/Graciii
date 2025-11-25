import { useState, useEffect, memo } from "react";
import { 
  Plus, Search, Edit, Trash2, BookOpen, Users, Link as LinkIcon,
  Check, AlertCircle, MoreVertical, UserPlus
} from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { subjectsAPI } from "../../services/apiService";

interface Subject {
  id: number;
  name: string;
  code: string;
  department: string;
  creditUnits: number;
  description?: string;
  assignedClasses: string[];
  assignedTeachers: { name: string; classes: string[] }[];
  status: "Active" | "Inactive";
  isCore: boolean;
}

interface Teacher {
  id: number;
  name: string;
  subjects: string[];
}

interface Class {
  id: number;
  name: string;
  level: string;
}

function ManageSubjectsPageComponent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Load subjects from API
  const [subjects, setSubjects] = useState<Subject[]>([]);  

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const response = await subjectsAPI.getAll();

      const rawList = Array.isArray(response)
        ? response
        : ((response as any)?.data && Array.isArray((response as any).data)
            ? (response as any).data
            : []);

      const transformedSubjects: Subject[] = rawList.map((sub: any) => {
        const statusRaw = (sub.status || '').toString();
        const status: 'Active' | 'Inactive' = statusRaw === 'Active' ? 'Active' : 'Inactive';

        return {
          id: Number(sub.id),
          name: sub.name || '',
          code: sub.code || 'N/A',
          department: sub.department || 'General',
          creditUnits: sub.credit_units || 1,
          description: sub.description || '',
          assignedClasses: [],
          assignedTeachers: [],
          status,
          isCore: Boolean(sub.is_core),
        };
      });

      setSubjects(transformedSubjects);
    } catch (error: any) {
      console.error('Error loading subjects:', error);
      toast.error('Failed to load subjects');
    }
  };

  const availableTeachers: Teacher[] = [
    { id: 1, name: "Mr. John Doe", subjects: ["Mathematics", "Further Mathematics"] },
    { id: 2, name: "Mrs. Sarah Ahmad", subjects: ["English Language", "Literature"] },
    { id: 3, name: "Mr. Ibrahim Hassan", subjects: ["Physics"] },
    { id: 4, name: "Ms. Aisha Mohammed", subjects: ["Chemistry"] },
    { id: 5, name: "Mr. Usman Garba", subjects: ["Biology"] },
    { id: 6, name: "Mrs. Fatima Bello", subjects: ["Economics"] },
    { id: 7, name: "Mr. Musa Aliyu", subjects: ["Government"] },
    { id: 8, name: "Mr. David Okon", subjects: ["Computer Science"] },
    { id: 9, name: "Mrs. Comfort James", subjects: ["Home Economics"] },
  ];

  const availableClasses: Class[] = [
    { id: 1, name: "JSS 1A", level: "JSS 1" },
    { id: 2, name: "JSS 1B", level: "JSS 1" },
    { id: 3, name: "JSS 2A", level: "JSS 2" },
    { id: 4, name: "JSS 2B", level: "JSS 2" },
    { id: 5, name: "JSS 3A", level: "JSS 3" },
    { id: 6, name: "SS 1A", level: "SS 1" },
    { id: 7, name: "SS 2A", level: "SS 2" },
    { id: 8, name: "SS 3A", level: "SS 3" },
  ];

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    department: "",
    status: "Active" as "Active" | "Inactive",
    isCore: false,
  });


  // Assignment state
  const [assignmentData, setAssignmentData] = useState({
    selectedClasses: [] as string[],
    selectedTeachers: [] as number[],
  });

  // Filter subjects
  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = 
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = filterDepartment === "All" || subject.department === filterDepartment;
    const matchesStatus = filterStatus === "All" || subject.status === filterStatus;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  // Get unique departments
  const departments = ["All", ...Array.from(new Set(subjects.map(s => s.department)))];

  // Statistics
  const stats = {
    totalSubjects: subjects.length,
    activeSubjects: subjects.filter(s => s.status === "Active").length,
    coreSubjects: subjects.filter(s => s.isCore).length,
    assignedSubjects: subjects.filter(s => s.assignedClasses.length > 0).length,
  };

  const handleCreateSubject = async () => {
    if (!formData.name || !formData.code || !formData.department) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const subjectData = {
        name: formData.name,
        code: formData.code,
        department: formData.department,
        status: formData.status === 'Active' ? 'active' : 'inactive',
        is_core: formData.isCore
      };

      await subjectsAPI.create(subjectData);
      toast.success(`Subject "${formData.name}" created successfully!`);
      setIsCreateDialogOpen(false);
      resetForm();
      loadSubjects(); // Reload the list
    } catch (error: any) {
      console.error('Error creating subject:', error);
      const message =
        (error?.data && (error.data.message as string)) ||
        (error?.message as string) ||
        'Failed to create subject';
      toast.error(message);
    }
  };

  const handleEditSubject = async () => {
    if (!selectedSubject || !formData.name || !formData.code || !formData.department) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const subjectData = {
        name: formData.name,
        code: formData.code,
        department: formData.department,
        status: formData.status === 'Active' ? 'active' : 'inactive',
        is_core: formData.isCore
      };

      await subjectsAPI.update(selectedSubject.id, subjectData);
      toast.success(`Subject "${formData.name}" updated successfully!`);
      setIsEditDialogOpen(false);
      setSelectedSubject(null);
      resetForm();
      loadSubjects(); // Reload the list
    } catch (error: any) {
      console.error('Error updating subject:', error);
      const message =
        (error?.data && (error.data.message as string)) ||
        (error?.message as string) ||
        'Failed to update subject';
      toast.error(message);
    }
  };

  const handleAssignSubject = () => {
    if (!selectedSubject) return;

    if (assignmentData.selectedClasses.length === 0) {
      toast.error("Please select at least one class");
      return;
    }

    if (assignmentData.selectedTeachers.length === 0) {
      toast.error("Please select at least one teacher");
      return;
    }

    const teacherAssignments = assignmentData.selectedTeachers.map(teacherId => {
      const teacher = availableTeachers.find(t => t.id === teacherId);
      return {
        name: teacher?.name || "",
        classes: assignmentData.selectedClasses,
      };
    });

    const updatedSubjects = subjects.map(subject =>
      subject.id === selectedSubject.id
        ? {
            ...subject,
            assignedClasses: [...new Set([...subject.assignedClasses, ...assignmentData.selectedClasses])],
            assignedTeachers: [...subject.assignedTeachers, ...teacherAssignments],
          }
        : subject
    );

    setSubjects(updatedSubjects);
    toast.success(`${assignmentData.selectedClasses.length} classes and ${assignmentData.selectedTeachers.length} teachers assigned to "${selectedSubject.name}"!`);
    setIsAssignDialogOpen(false);
    setSelectedSubject(null);
    setAssignmentData({ selectedClasses: [], selectedTeachers: [] });
  };

  const handleDeleteSubject = async () => {
    if (!selectedSubject) return;

    try {
      await subjectsAPI.delete(selectedSubject.id);
      toast.success(`Subject "${selectedSubject.name}" deleted successfully!`);
      setDeleteDialogOpen(false);
      setSelectedSubject(null);
      loadSubjects(); // Reload the list
    } catch (error: any) {
      console.error('Error deleting subject:', error);
      const message =
        (error?.data && (error.data.message as string)) ||
        (error?.message as string) ||
        'Failed to delete subject';
      toast.error(message);
      setDeleteDialogOpen(false);
    }
  };

  const openEditDialog = (subject: Subject) => {
    setSelectedSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code,
      department: subject.department,
      status: subject.status,
      isCore: subject.isCore,
    });
    setIsEditDialogOpen(true);
  };

  const openAssignDialog = (subject: Subject) => {
    setSelectedSubject(subject);
    setAssignmentData({ selectedClasses: [], selectedTeachers: [] });
    setIsAssignDialogOpen(true);
  };

  const openDeleteDialog = (subject: Subject) => {
    setSelectedSubject(subject);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      department: "",
      status: "Active",
      isCore: false,
    });
  };

  const SubjectFormDialog = ({ isOpen, onClose, onSubmit, title }: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSubmit: () => void; 
    title: string;
  }) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-2xl bg-[#132C4A] border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        <div className="space-y-6 py-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Subject Name *</Label>
              <Input
                placeholder="e.g., Mathematics, English"
                value={formData.name}
                onChange={(e) => {
                  e.stopPropagation();
                  setFormData(prev => ({ ...prev, name: e.target.value }));
                }}
                onFocus={(e) => e.stopPropagation()}
                className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Subject Code *</Label>
              <Input
                placeholder="e.g., MTH101"
                value={formData.code}
                onChange={(e) => {
                  e.stopPropagation();
                  setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }));
                }}
                onFocus={(e) => e.stopPropagation()}
                className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Department *</Label>
              <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F243E] border-white/10">
                  <SelectItem value="Sciences" className="text-white hover:bg-[#1E90FF]">Sciences</SelectItem>
                  <SelectItem value="Arts" className="text-white hover:bg-[#1E90FF]">Arts</SelectItem>
                  <SelectItem value="Commercial" className="text-white hover:bg-[#1E90FF]">Commercial</SelectItem>
                  <SelectItem value="Technology" className="text-white hover:bg-[#1E90FF]">Technology</SelectItem>
                  <SelectItem value="General" className="text-white hover:bg-[#1E90FF]">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Status *</Label>
              <Select value={formData.status} onValueChange={(value: "Active" | "Inactive") => setFormData({ ...formData, status: value })}>
                <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F243E] border-white/10">
                  <SelectItem value="Active" className="text-white hover:bg-[#1E90FF]">Active</SelectItem>
                  <SelectItem value="Inactive" className="text-white hover:bg-[#1E90FF]">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isCore}
                onChange={(e) => setFormData({ ...formData, isCore: e.target.checked })}
                className="rounded border-white/10 bg-[#0F243E] text-blue-500"
              />
              Core Subject
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#1E90FF] hover:bg-[#00BFFF] text-white"
            >
              Create Subject
            </Button>
          </DialogFooter>
        </div>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-white mb-2">Manage Subjects</h1>
        <p className="text-[#C0C8D3]">Create, edit subjects and assign to classes and teachers</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg hover:shadow-2xl transition-all hover:scale-105 group">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#C0C8D3]">Total Subjects</p>
              <BookOpen className="w-6 h-6 text-[#1E90FF] group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-white mb-2">{stats.totalSubjects}</p>
            <p className="text-xs text-[#00BFFF]">All subjects</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg hover:shadow-2xl transition-all hover:scale-105 group">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#C0C8D3]">Active Subjects</p>
              <Check className="w-6 h-6 text-[#28A745] group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-white mb-2">{stats.activeSubjects}</p>
            <p className="text-xs text-[#28A745]">Currently offered</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg hover:shadow-2xl transition-all hover:scale-105 group">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#C0C8D3]">Core Subjects</p>
              <AlertCircle className="w-6 h-6 text-[#FFD700] group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-white mb-2">{stats.coreSubjects}</p>
            <p className="text-xs text-[#FFD700]">Mandatory</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg hover:shadow-2xl transition-all hover:scale-105 group">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[#C0C8D3]">Assigned</p>
              <Users className="w-6 h-6 text-[#00BFFF] group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-white mb-2">{stats.assignedSubjects}</p>
            <p className="text-xs text-[#C0C8D3]">With classes</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
        <CardContent className="p-5">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-white">Search Subjects</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C0C8D3]" />
                <Input
                  placeholder="Search by name or code..."
                  value={searchQuery}
                  onChange={(e) => {
                    e.stopPropagation();
                    setSearchQuery(e.target.value);
                  }}
                  onFocus={(e) => e.stopPropagation()}
                  className="h-12 pl-11 rounded-xl border border-white/10 bg-[#0F243E] text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Filter by Department</Label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0F243E] border-white/10">
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept} className="text-white hover:bg-[#1E90FF]">
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Filter by Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0F243E] border-white/10">
                  <SelectItem value="All" className="text-white hover:bg-[#1E90FF]">All Status</SelectItem>
                  <SelectItem value="Active" className="text-white hover:bg-[#1E90FF]">Active</SelectItem>
                  <SelectItem value="Inactive" className="text-white hover:bg-[#1E90FF]">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => {
                resetForm();
                setIsCreateDialogOpen(true);
              }}
              className="bg-[#28A745] hover:bg-[#28A745]/90 text-white rounded-xl shadow-md hover:scale-105 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Subject
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subjects Table */}
      <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
        <CardHeader className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-white">All Subjects ({filteredSubjects.length})</h3>
            <Badge className="bg-[#1E90FF] text-white border-0">
              {filterDepartment !== "All" ? filterDepartment : "All Departments"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-[#1E90FF] to-[#00BFFF] border-none hover:bg-gradient-to-r">
                  <TableHead className="text-white">Subject</TableHead>
                  <TableHead className="text-white">Code</TableHead>
                  <TableHead className="text-white">Credits</TableHead>
                  <TableHead className="text-white">Department</TableHead>
                  <TableHead className="text-white text-center">Type</TableHead>
                  <TableHead className="text-white text-center">Classes</TableHead>
                  <TableHead className="text-white text-center">Teachers</TableHead>
                  <TableHead className="text-white text-center">Status</TableHead>
                  <TableHead className="text-white text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubjects.length === 0 ? (
                  <TableRow className="bg-[#0F243E] border-b border-white/5">
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <BookOpen className="w-12 h-12 text-[#C0C8D3]" />
                        <p className="text-white">No subjects found</p>
                        <p className="text-[#C0C8D3] text-sm">Try adjusting your search or filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubjects.map((subject) => (
                    <TableRow key={subject.id} className="bg-[#0F243E] border-b border-white/5 hover:bg-[#132C4A]">
                      <TableCell className="text-white">
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 rounded-lg ${
                            subject.department === "Sciences"
                              ? "bg-gradient-to-br from-[#10B981] to-[#059669]"
                              : subject.department === "Arts"
                              ? "bg-gradient-to-br from-[#F59E0B] to-[#D97706]"
                              : subject.department === "Commercial"
                              ? "bg-gradient-to-br from-[#3B82F6] to-[#2563EB]"
                              : subject.department === "Technology"
                              ? "bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED]"
                              : "bg-gradient-to-br from-[#6B7280] to-[#4B5563]"
                          } flex items-center justify-center`}>
                            <BookOpen className="w-5 h-5 text-white" />
                          </div>
                          <span className="font-medium">{subject.name}</span>
                          {subject.isCore && (
                            <Badge className="bg-[#FFD700] text-[#0A192F] border-0 text-xs mt-1">Core</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-white">{subject.code}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${
                          subject.department === "Sciences"
                            ? "bg-[#10B981] text-white"
                            : subject.department === "Arts"
                            ? "bg-[#F59E0B] text-white"
                            : subject.department === "Commercial"
                            ? "bg-[#3B82F6] text-white"
                            : subject.department === "Technology"
                            ? "bg-[#8B5CF6] text-white"
                            : "bg-[#6B7280] text-white"
                        } border-0`}>
                          {subject.creditUnits} Credits
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white">{subject.department}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${
                          subject.isCore ? "bg-[#FFD700] text-[#0A192F]" : "bg-[#00BFFF] text-white"
                        } border-0`}>
                          {subject.isCore ? "Core" : "Elective"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-[#0F243E] text-white border border-white/10">
                          {subject.assignedClasses.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-[#0F243E] text-white border border-white/10">
                          {subject.assignedTeachers.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${
                          subject.status === "Active" 
                            ? "bg-[#28A745] text-white" 
                            : "bg-[#DC3545] text-white"
                        } border-0`}>
                          {subject.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 text-white hover:bg-[#1E90FF]"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#0F243E] border-white/10">
                            <DropdownMenuItem
                              onClick={() => openAssignDialog(subject)}
                              className="text-white hover:bg-[#28A745] hover:text-white cursor-pointer"
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Assign to Classes
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEditDialog(subject)}
                              className="text-white hover:bg-[#1E90FF] cursor-pointer"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Subject
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(subject)}
                              className="text-[#DC3545] hover:bg-[#DC3545] hover:text-white cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Subject
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialogs */}
      <SubjectFormDialog
        isOpen={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          resetForm();
        }}
        onSubmit={handleCreateSubject}
        title="Create New Subject"
      />

      <SubjectFormDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedSubject(null);
          resetForm();
        }}
        onSubmit={handleEditSubject}
        title="Edit Subject"
      />

      {/* Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-3xl rounded-2xl bg-[#132C4A] border border-white/10 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Assign "{selectedSubject?.name}" to Classes & Teachers
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Select Classes */}
            <div className="space-y-3">
              <Label className="text-white">Select Classes *</Label>
              <div className="grid md:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-3 bg-[#0F243E] rounded-xl border border-white/10">
                {availableClasses.map(cls => (
                  <div key={cls.id} className="flex items-center space-x-3 p-2 hover:bg-[#132C4A] rounded-lg transition-colors">
                    <Checkbox
                      id={`class-${cls.id}`}
                      checked={assignmentData.selectedClasses.includes(cls.name)}
                      onCheckedChange={(checked: boolean) => {
                        if (checked) {
                          setAssignmentData({
                            ...assignmentData,
                            selectedClasses: [...assignmentData.selectedClasses, cls.name]
                          });
                        } else {
                          setAssignmentData({
                            ...assignmentData,
                            selectedClasses: assignmentData.selectedClasses.filter(c => c !== cls.name)
                          });
                        }
                      }}
                      className="border-white/20"
                    />
                    <Label htmlFor={`class-${cls.id}`} className="text-white cursor-pointer flex-1">
                      {cls.name}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#C0C8D3]">
                Selected: {assignmentData.selectedClasses.length} classes
              </p>
            </div>

            {/* Select Teachers */}
            <div className="space-y-3">
              <Label className="text-white">Select Teachers *</Label>
              <div className="grid md:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-3 bg-[#0F243E] rounded-xl border border-white/10">
                {availableTeachers.map(teacher => (
                  <div key={teacher.id} className="flex items-center space-x-3 p-2 hover:bg-[#132C4A] rounded-lg transition-colors">
                    <Checkbox
                      id={`teacher-${teacher.id}`}
                      checked={assignmentData.selectedTeachers.includes(teacher.id)}
                      onCheckedChange={(checked: boolean) => {
                        if (checked) {
                          setAssignmentData({
                            ...assignmentData,
                            selectedTeachers: [...assignmentData.selectedTeachers, teacher.id]
                          });
                        } else {
                          setAssignmentData({
                            ...assignmentData,
                            selectedTeachers: assignmentData.selectedTeachers.filter(t => t !== teacher.id)
                          });
                        }
                      }}
                      className="border-white/20"
                    />
                    <Label htmlFor={`teacher-${teacher.id}`} className="text-white cursor-pointer flex-1">
                      {teacher.name}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#C0C8D3]">
                Selected: {assignmentData.selectedTeachers.length} teachers
              </p>
            </div>

            <div className="p-4 bg-[#1E90FF]/10 border border-[#1E90FF] rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#1E90FF] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm mb-1">Assignment Notes</p>
                  <p className="text-[#C0C8D3] text-xs">
                    • Selected teachers will be assigned to all selected classes<br />
                    • You can assign multiple teachers to the same subject<br />
                    • Teachers will receive notification of assignment
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => {
                setIsAssignDialogOpen(false);
                setSelectedSubject(null);
                setAssignmentData({ selectedClasses: [], selectedTeachers: [] });
              }}
              variant="outline"
              className="rounded-xl border-white/10 text-[#C0C8D3] hover:bg-[#0F243E] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignSubject}
              className="bg-[#28A745] hover:bg-[#28A745]/90 text-white rounded-xl shadow-md hover:scale-105 transition-all"
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              Assign Subject
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl bg-[#132C4A] border border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Subject</AlertDialogTitle>
            <AlertDialogDescription className="text-[#C0C8D3]">
              Are you sure you want to delete "{selectedSubject?.name}"?
              {selectedSubject && selectedSubject.assignedClasses.length > 0 && (
                <span className="block mt-2 text-[#DC3545]">
                  ⚠️ This subject is assigned to {selectedSubject.assignedClasses.length} classes. Please remove assignments first.
                </span>
              )}
              {selectedSubject && selectedSubject.assignedClasses.length === 0 && (
                <span className="block mt-2">
                  This action cannot be undone.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-white/10 text-[#C0C8D3] hover:bg-[#0F243E] hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubject}
              className="bg-[#DC3545] hover:bg-[#DC3545]/90 text-white rounded-xl"
            >
              Delete Subject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Export memoized version to prevent unnecessary re-renders from parent
export const ManageSubjectsPage = memo(ManageSubjectsPageComponent);
