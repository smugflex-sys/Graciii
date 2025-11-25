import { useState } from "react";
import { Search, Edit, Trash2, Eye, Award, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";

export function ManageTeachersPage() {
  const { teachers, deleteTeacher, updateTeacher, classes, subjectAssignments } = useSchool();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    qualification: "",
    specialization: [] as string[],
  });

  // Get class teacher assignment for a teacher
  const getClassTeacherInfo = (teacherId: number) => {
    const teacherClasses = classes.filter(c => c.classTeacherId === teacherId);
    return teacherClasses;
  };

  // Get subject assignments for a teacher
  const getTeacherSubjects = (teacherId: number) => {
    return subjectAssignments.filter(a => a.teacherId === teacherId);
  };

  // Filter teachers based on search
  const filteredTeachers = teachers.filter(teacher => {
    const fullName = `${teacher.firstName} ${teacher.lastName}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return fullName.includes(searchLower) || 
           teacher.employeeId.toLowerCase().includes(searchLower) ||
           teacher.email.toLowerCase().includes(searchLower);
  });

  const handleEdit = (teacher: any) => {
    setSelectedTeacher(teacher);
    setEditFormData({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone,
      qualification: teacher.qualification,
      specialization: teacher.specialization,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedTeacher) return;

    updateTeacher(selectedTeacher.id, editFormData);
    toast.success(`Teacher ${editFormData.firstName} ${editFormData.lastName} updated successfully`);
    setIsEditDialogOpen(false);
    setSelectedTeacher(null);
  };

  const handleDelete = (teacherId: number, teacherName: string) => {
    if (confirm(`Are you sure you want to delete ${teacherName}? This action cannot be undone.`)) {
      deleteTeacher(teacherId);
      toast.success(`Teacher ${teacherName} deleted successfully`);
    }
  };

  const handleView = (teacher: any) => {
    setSelectedTeacher(teacher);
    setIsViewDialogOpen(true);
  };

  // Calculate statistics
  const stats = {
    total: teachers.length,
    active: teachers.filter(t => t.status === 'Active').length,
    classTeachers: teachers.filter(t => t.isClassTeacher).length,
    inactive: teachers.filter(t => t.status === 'Inactive').length,
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Manage Teachers</h1>
        <p className="text-[#6B7280]">View, edit, and manage all teaching staff</p>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50 rounded-xl">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Note:</strong> To add new teachers, please use the "Register User" page from the main menu. This page is for viewing and managing existing teachers only.
        </AlertDescription>
      </Alert>

      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-5 border-b border-[#E5E7EB]">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email or employee ID..."
                className="h-12 pl-10 rounded-xl border border-[#E5E7EB] bg-white text-[#1F2937]"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#2563EB] border-none hover:bg-[#2563EB]">
                  <TableHead className="text-white">Employee ID</TableHead>
                  <TableHead className="text-white">Name</TableHead>
                  <TableHead className="text-white">Email</TableHead>
                  <TableHead className="text-white">Specialization</TableHead>
                  <TableHead className="text-white">Class Teacher</TableHead>
                  <TableHead className="text-white">Qualification</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.length === 0 ? (
                  <TableRow className="bg-white">
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Search className="w-12 h-12 text-[#9CA3AF]" />
                        <p className="text-[#1F2937]">No teachers found</p>
                        <p className="text-[#6B7280] text-sm">Try adjusting your search criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeachers.map((teacher) => {
                    const classTeacherInfo = getClassTeacherInfo(teacher.id);
                    return (
                      <TableRow key={teacher.id} className="bg-white border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                        <TableCell className="text-[#1F2937]">{teacher.employeeId}</TableCell>
                        <TableCell className="text-[#1F2937]">
                          {teacher.firstName} {teacher.lastName}
                        </TableCell>
                        <TableCell className="text-[#6B7280] text-sm">{teacher.email}</TableCell>
                        <TableCell className="text-[#6B7280] text-sm">
                          {teacher.specialization.join(', ')}
                        </TableCell>
                        <TableCell>
                          {classTeacherInfo.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {classTeacherInfo.map((cls) => (
                                <Badge key={cls.id} className="bg-[#10B981] text-white border-0 text-xs">
                                  {cls.name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[#9CA3AF] text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-[#3B82F6] text-white border-0">
                            <Award className="w-3 h-3 mr-1" />
                            {teacher.qualification}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={teacher.status === 'Active' ? "bg-[#10B981] text-white border-0" : "bg-[#EF4444] text-white border-0"}>
                            {teacher.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              onClick={() => handleView(teacher)}
                              size="sm"
                              className="h-8 w-8 p-0 bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleEdit(teacher)}
                              size="sm"
                              className="h-8 w-8 p-0 bg-[#F59E0B] hover:bg-[#D97706] rounded-lg"
                              title="Edit Teacher"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(teacher.id, `${teacher.firstName} ${teacher.lastName}`)}
                              size="sm"
                              className="h-8 w-8 p-0 bg-[#EF4444] hover:bg-[#DC2626] rounded-lg"
                              title="Delete Teacher"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all">
          <CardContent className="p-4">
            <p className="text-[#6B7280] mb-1">Total Teachers</p>
            <p className="text-[#1F2937]">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all">
          <CardContent className="p-4">
            <p className="text-[#6B7280] mb-1">Active Teachers</p>
            <p className="text-[#10B981]">{stats.active}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all">
          <CardContent className="p-4">
            <p className="text-[#6B7280] mb-1">Class Teachers</p>
            <p className="text-[#3B82F6]">{stats.classTeachers}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all">
          <CardContent className="p-4">
            <p className="text-[#6B7280] mb-1">Inactive</p>
            <p className="text-[#EF4444]">{stats.inactive}</p>
          </CardContent>
        </Card>
      </div>

      {/* View Teacher Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl rounded-xl bg-white border border-[#E5E7EB]">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937]">Teacher Details</DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              View complete information about this teacher
            </DialogDescription>
          </DialogHeader>
          {selectedTeacher && (
            <div className="space-y-4 py-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Employee ID</Label>
                  <p className="text-[#1F2937]">{selectedTeacher.employeeId}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Status</Label>
                  <Badge className={selectedTeacher.status === 'Active' ? "bg-[#10B981] text-white" : "bg-[#EF4444] text-white"}>
                    {selectedTeacher.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">First Name</Label>
                  <p className="text-[#1F2937]">{selectedTeacher.firstName}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Last Name</Label>
                  <p className="text-[#1F2937]">{selectedTeacher.lastName}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Email</Label>
                  <p className="text-[#1F2937]">{selectedTeacher.email}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Phone</Label>
                  <p className="text-[#1F2937]">{selectedTeacher.phone}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Qualification</Label>
                  <p className="text-[#1F2937]">{selectedTeacher.qualification}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#6B7280]">Specialization</Label>
                  <p className="text-[#1F2937]">{selectedTeacher.specialization.join(', ')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#6B7280]">Class Teacher Assignments</Label>
                <div className="flex flex-wrap gap-2">
                  {getClassTeacherInfo(selectedTeacher.id).map((cls) => (
                    <Badge key={cls.id} className="bg-[#10B981] text-white">
                      {cls.name}
                    </Badge>
                  ))}
                  {getClassTeacherInfo(selectedTeacher.id).length === 0 && (
                    <span className="text-[#9CA3AF] text-sm">No class teacher assignments</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#6B7280]">Subject Assignments</Label>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {getTeacherSubjects(selectedTeacher.id).map((assignment) => (
                    <div key={assignment.id} className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[#1F2937]">{assignment.subjectName}</p>
                          <p className="text-sm text-[#6B7280]">{assignment.className}</p>
                        </div>
                        <Badge className="bg-[#3B82F6] text-white text-xs">
                          {assignment.term}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {getTeacherSubjects(selectedTeacher.id).length === 0 && (
                    <p className="text-[#9CA3AF] text-sm">No subject assignments</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => setIsViewDialogOpen(false)}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Teacher Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl rounded-xl bg-white border border-[#E5E7EB]">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937]">Edit Teacher</DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              Update teacher information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#1F2937]">First Name</Label>
                <Input
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                  className="rounded-xl border-[#E5E7EB] bg-white text-[#1F2937]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#1F2937]">Last Name</Label>
                <Input
                  value={editFormData.lastName}
                  onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                  className="rounded-xl border-[#E5E7EB] bg-white text-[#1F2937]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#1F2937]">Email</Label>
                <Input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="rounded-xl border-[#E5E7EB] bg-white text-[#1F2937]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#1F2937]">Phone</Label>
                <Input
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  className="rounded-xl border-[#E5E7EB] bg-white text-[#1F2937]"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[#1F2937]">Qualification</Label>
                <Input
                  value={editFormData.qualification}
                  onChange={(e) => setEditFormData({ ...editFormData, qualification: e.target.value })}
                  className="rounded-xl border-[#E5E7EB] bg-white text-[#1F2937]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsEditDialogOpen(false)}
              variant="outline"
              className="rounded-xl border-[#E5E7EB] text-[#1F2937]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
