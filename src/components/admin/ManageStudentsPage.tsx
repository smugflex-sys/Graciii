import { useState, useEffect } from "react";
import { Search, Edit, Trash2, Eye, UserPlus, Link as LinkIcon, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { toast } from "sonner";
import { studentsAPI, classesAPI } from "../../services/apiService";
import { useSchool, Student } from "../../contexts/SchoolContext";
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

interface ManageStudentsPageProps {
  onNavigateToLink?: () => void;
}

export function ManageStudentsPage({ onNavigateToLink }: ManageStudentsPageProps) {
  const { students, classes, addStudent, updateStudent, deleteStudent, parents } = useSchool();
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState<string | number>("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editErrors, setEditErrors] = useState<{ [key: string]: string }>({});
  
  // Helper function to get parent name
  const getParentName = (parentId: number | null) => {
    if (!parentId) return null;
    const parent = parents.find(p => p.id === parentId);
    return parent ? `${parent.firstName} ${parent.lastName}` : null;
  };

  // Filter students based on search and class filter
  const filteredStudents = students.filter(student => {
    const matchesSearch = !searchTerm || 
      `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.className.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = !filterClass || student.classId?.toString() === filterClass.toString();
    
    return matchesSearch && matchesClass;
  });
  const [editFormData, setEditFormData] = useState<{
    firstName: string;
    lastName: string;
    admissionNumber: string;
    classId: string;
    gender: string;
    dateOfBirth: string;
    status: string;
  }>({
    firstName: '',
    lastName: '',
    admissionNumber: '',
    classId: '',
    gender: '',
    dateOfBirth: '',
    status: 'Active'
  });

  const handleView = (student: any) => {
    setSelectedStudent(student);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (student: any) => {
    setSelectedStudent(student);
    setEditFormData({
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      admissionNumber: student.admissionNumber || '',
      classId: student.classId?.toString() || '',
      gender: student.gender || '',
      dateOfBirth: student.dateOfBirth || '',
      status: student.status || 'Active'
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (studentId: number, studentName: string) => {
    setStudentToDelete({ id: studentId, name: studentName });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;

    setIsDeleting(true);
    try {
      await deleteStudent(studentToDelete.id);
      toast.success(`${studentToDelete.name} has been deleted successfully`);
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
    } catch (error: any) {
      console.error('Error deleting student:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete student';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setStudentToDelete(null);
  };

  const validateEditForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!editFormData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (editFormData.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }

    if (!editFormData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (editFormData.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }

    if (!editFormData.admissionNumber.trim()) {
      errors.admissionNumber = 'Admission number is required';
    }

    if (!editFormData.gender) {
      errors.gender = 'Gender is required';
    }

    if (!editFormData.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    } else {
      const dob = new Date(editFormData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      
      if (age < 3 || age > 25) {
        errors.dateOfBirth = 'Student age should be between 3 and 25 years';
      }
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateStudent = async () => {
    if (!selectedStudent || !validateEditForm()) {
      toast.error('Please fix all validation errors');
      return;
    }

    setIsUpdating(true);
    try {
      const updateData = {
        firstName: editFormData.firstName.trim(),
        lastName: editFormData.lastName.trim(),
        admissionNumber: editFormData.admissionNumber.trim(),
        classId: editFormData.classId ? parseInt(editFormData.classId) : undefined,
        gender: editFormData.gender as "Male" | "Female",
        dateOfBirth: editFormData.dateOfBirth,
        status: editFormData.status as "Active" | "Inactive" | "Graduated"
      };

      await updateStudent(selectedStudent.id, updateData);
      toast.success('Student information updated successfully');
      setIsEditDialogOpen(false);
      setEditErrors({});
    } catch (error: any) {
      console.error('Error updating student:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update student';
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLinkToParent = () => {
    if (onNavigateToLink) {
      onNavigateToLink();
    } else {
      toast.info("Navigating to Link Student-Parent page");
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-white mb-2">Manage Students</h1>
        <p className="text-[#C0C8D3]">View, edit, and manage all registered students</p>
      </div>

      <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
        <CardHeader className="p-5 border-b border-white/10">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#C0C8D3]" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or admission number..."
                className="h-12 pl-10 rounded-xl border border-white/10 bg-[#0F243E] text-white"
              />
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <Select value={String(filterClass)} onValueChange={(value: string) => setFilterClass(value)}>
                <SelectTrigger className="h-12 w-full md:w-40 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F243E] border-white/10">
                  <SelectItem value="all" className="text-white hover:bg-[#1E90FF]">All Classes</SelectItem>
                  <SelectItem value="Primary" className="text-white hover:bg-[#1E90FF]">Primary</SelectItem>
                  <SelectItem value="JSS" className="text-white hover:bg-[#1E90FF]">JSS</SelectItem>
                  <SelectItem value="SS" className="text-white hover:bg-[#1E90FF]">SS</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={handleLinkToParent}
                className="h-12 bg-[#28A745] hover:bg-[#28A745]/90 text-white rounded-xl shadow-md hover:scale-105 transition-all whitespace-nowrap"
              >
                <LinkIcon className="w-5 h-5 mr-2" />
                Link to Parent
              </Button>

              <Button 
                onClick={() => toast.info("Navigate to Add Student page")}
                className="h-12 bg-[#1E90FF] hover:bg-[#00BFFF] text-white rounded-xl shadow-md hover:scale-105 transition-all whitespace-nowrap"
              >
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
                  <TableHead className="text-white">Admission No.</TableHead>
                  <TableHead className="text-white">Student Name</TableHead>
                  <TableHead className="text-white">Class</TableHead>
                  <TableHead className="text-white">Parent/Guardian</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1E90FF]" />
                      <p className="text-[#C0C8D3] mt-2">Loading students...</p>
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-[#C0C8D3]">No students found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student: Student) => (
                    <TableRow key={student.id} className="bg-[#0F243E] border-b border-white/5 hover:bg-[#132C4A]">
                      <TableCell className="text-[#C0C8D3]">{student.admissionNumber || 'N/A'}</TableCell>
                      <TableCell className="text-white">{`${student.firstName} ${student.lastName}`}</TableCell>
                      <TableCell className="text-[#C0C8D3]">{student.className || 'N/A'}</TableCell>
                      <TableCell className="text-[#C0C8D3]">{getParentName(student.parentId) || 'Not linked'}</TableCell>
                      <TableCell>
                        <Badge className={student.status === 'Active' ? "bg-[#28A745] text-white border-0" : "bg-[#DC3545] text-white border-0"}>
                          {student.status || 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            onClick={() => handleView(student)}
                            size="sm"
                            className="h-8 w-8 p-0 bg-[#1E90FF] hover:bg-[#00BFFF] rounded-lg"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={handleLinkToParent}
                            size="sm"
                            className="h-8 w-8 p-0 bg-[#28A745] hover:bg-[#28A745]/90 rounded-lg"
                            title="Link to Parent"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleEdit(student)}
                            size="sm"
                            className="h-8 w-8 p-0 bg-[#FFC107] hover:bg-[#FFC107]/90 rounded-lg"
                            title="Edit Student"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDelete(student.id, student.firstName + ' ' + student.lastName)}
                            size="sm"
                            className="h-8 w-8 p-0 bg-[#DC3545] hover:bg-[#DC3545]/90 rounded-lg"
                            title="Delete Student"
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
            <p className="text-[#C0C8D3] mb-1">Total Students</p>
            <p className="text-white text-2xl font-bold">{students.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1">Active</p>
            <p className="text-[#28A745] text-2xl font-bold">
              {students.filter(s => s.status === 'Active').length}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1">Classes</p>
            <p className="text-[#1E90FF] text-2xl font-bold">{classes.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-4">
            <p className="text-[#C0C8D3] mb-1">Inactive</p>
            <p className="text-[#DC3545] text-2xl font-bold">
              {students.filter(s => s.status === 'Inactive').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* View Student Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="bg-[#132C4A] text-white border-white/10">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div>
                <Label className="text-[#C0C8D3]">Full Name</Label>
                <p className="text-white font-medium">{`${selectedStudent.firstName} ${selectedStudent.lastName}`}</p>
              </div>
              <div>
                <Label className="text-[#C0C8D3]">Registration Number</Label>
                <p className="text-white">{selectedStudent.admissionNumber || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-[#C0C8D3]">Class</Label>
                <p className="text-white">{selectedStudent.className || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-[#C0C8D3]">Gender</Label>
                <p className="text-white">{selectedStudent.gender || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-[#C0C8D3]">Date of Birth</Label>
                <p className="text-white">{selectedStudent.dateOfBirth || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-[#C0C8D3]">Status</Label>
                <Badge className={selectedStudent.status === 'Active' ? "bg-[#28A745]" : "bg-[#DC3545]"}>
                  {selectedStudent.status || 'Active'}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[#132C4A] text-white border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div>
                <Label className="text-[#C0C8D3]">First Name</Label>
                <Input
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                  className={`bg-[#1E3A5F] border ${editErrors.firstName ? 'border-red-500' : 'border-white/20'} text-white`}
                  placeholder="Enter first name"
                />
                {editErrors.firstName && <p className="text-xs text-red-400 mt-1">{editErrors.firstName}</p>}
              </div>
              <div>
                <Label className="text-[#C0C8D3]">Last Name</Label>
                <Input
                  value={editFormData.lastName}
                  onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                  className={`bg-[#1E3A5F] border ${editErrors.lastName ? 'border-red-500' : 'border-white/20'} text-white`}
                  placeholder="Enter last name"
                />
                {editErrors.lastName && <p className="text-xs text-red-400 mt-1">{editErrors.lastName}</p>}
              </div>
              <div>
                <Label className="text-[#C0C8D3]">Admission Number</Label>
                <Input
                  value={editFormData.admissionNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, admissionNumber: e.target.value })}
                  className={`bg-[#1E3A5F] border ${editErrors.admissionNumber ? 'border-red-500' : 'border-white/20'} text-white`}
                  placeholder="Enter registration number"
                />
                {editErrors.admissionNumber && <p className="text-xs text-red-400 mt-1">{editErrors.admissionNumber}</p>}
              </div>
              <div>
                <Label className="text-[#C0C8D3]">Class</Label>
                <Select value={editFormData.classId} onValueChange={(value: string) => setEditFormData(prev => ({ ...prev, classId: value }))}>
                  <SelectTrigger className={`bg-[#1E3A5F] border ${editErrors.classId ? 'border-red-500' : 'border-white/20'} text-white`}>
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E3A5F] border-white/20">
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()} className="text-white">
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editErrors.classId && <p className="text-xs text-red-400 mt-1">{editErrors.classId}</p>}
              </div>
              <div>
                <Label className="text-[#C0C8D3]">Gender</Label>
                <Select value={editFormData.gender} onValueChange={(value: string) => setEditFormData(prev => ({ ...prev, gender: value }))}>
                  <SelectTrigger className={`bg-[#1E3A5F] border ${editErrors.gender ? 'border-red-500' : 'border-white/20'} text-white`}>
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E3A5F] border-white/20">
                    <SelectItem value="Male" className="text-white">Male</SelectItem>
                    <SelectItem value="Female" className="text-white">Female</SelectItem>
                  </SelectContent>
                </Select>
                {editErrors.gender && <p className="text-xs text-red-400 mt-1">{editErrors.gender}</p>}
              </div>
              <div>
                <Label className="text-[#C0C8D3]">Date of Birth</Label>
                <Input
                  type="date"
                  value={editFormData.dateOfBirth}
                  onChange={(e) => setEditFormData({ ...editFormData, dateOfBirth: e.target.value })}
                  className={`bg-[#1E3A5F] border ${editErrors.dateOfBirth ? 'border-red-500' : 'border-white/20'} text-white`}
                />
                {editErrors.dateOfBirth && <p className="text-xs text-red-400 mt-1">{editErrors.dateOfBirth}</p>}
              </div>
              <div>
                <Label className="text-[#C0C8D3]">Status</Label>
                <Select value={editFormData.status} onValueChange={(value: string) => setEditFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger className={`bg-[#1E3A5F] border ${editErrors.status ? 'border-red-500' : 'border-white/20'} text-white`}>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1E3A5F] border-white/20">
                    <SelectItem value="Active" className="text-white">Active</SelectItem>
                    <SelectItem value="Inactive" className="text-white">Inactive</SelectItem>
                    <SelectItem value="Graduated" className="text-white">Graduated</SelectItem>
                  </SelectContent>
                </Select>
                {editErrors.status && <p className="text-xs text-red-400 mt-1">{editErrors.status}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditErrors({});
                  }}
                  className="border-white/20 text-white hover:bg-white/10"
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateStudent}
                  className="bg-[#FFD700] text-[#0A2540] hover:bg-[#FFD700]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-[#0A2540] border-t-transparent rounded-full animate-spin"></div>
                      Updating...
                    </>
                  ) : (
                    'Update Student'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-[#132C4A] text-white border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Delete Student
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#C0C8D3]">
              Are you sure you want to delete <strong>{studentToDelete?.name}</strong>? This action cannot be undone and will permanently remove all student records, including scores and payment history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={cancelDelete}
              className="border-white/20 text-white hover:bg-white/10"
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Deleting...
                </>
              ) : (
                'Delete Student'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
