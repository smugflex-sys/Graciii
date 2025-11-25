import { useState } from 'react';
import { useSchool } from '../../contexts/SchoolContext';
import { classesAPI, teacherAssignmentsAPI } from '../../services/apiService';
import { Plus, Search, Trash2, BookOpen, Users, X, Check, AlertCircle, Award, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';

export function ManageTeacherAssignmentsPage() {
  const {
    teachers,
    classes,
    subjects,
    subjectAssignments,
    addSubjectAssignment,
    deleteSubjectAssignment,
    currentAcademicYear,
    currentTerm,
    updateClass,
    updateTeacher,
    getTeacherClassTeacherAssignments,
    validateClassTeacherAssignment,
    createTeacherAssignments,
    deleteTeacherAssignment,
  } = useSchool();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('All');
  const [filterClass, setFilterClass] = useState('All');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isClassTeacherDialogOpen, setIsClassTeacherDialogOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [selectedAssignments, setSelectedAssignments] = useState<{ subjectId: number; classId: number }[]>([]);
  const [selectedClassForTeacher, setSelectedClassForTeacher] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null); // For filtering subjects by class

  // Filter assignments
  const filteredAssignments = subjectAssignments.filter((assignment) => {
    const matchesSearch =
      assignment.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.className.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTeacher = filterTeacher === 'All' || assignment.teacherId === parseInt(filterTeacher);
    const matchesClass = filterClass === 'All' || assignment.classId === parseInt(filterClass);

    return matchesSearch && matchesTeacher && matchesClass;
  });

  // Statistics
  const stats = {
    totalAssignments: subjectAssignments.length,
    uniqueTeachers: new Set(subjectAssignments.map((a) => a.teacherId)).size,
    uniqueSubjects: new Set(subjectAssignments.map((a) => a.subjectId)).size,
    uniqueClasses: new Set(subjectAssignments.map((a) => a.classId)).size,
  };

  const handleOpenAssignDialog = (teacherId?: number) => {
    if (teacherId) {
      setSelectedTeacherId(teacherId);
    }
    setSelectedAssignments([]);
    setSelectedClassId(null); // Reset class filter
    setIsAssignDialogOpen(true);
  };

  const handleAddAssignment = (subjectId: number, classId: number) => {
    // Check if subject+class is already assigned to any teacher
    const existingAssignment = subjectAssignments.find(
      (a) => a.subjectId === subjectId && a.classId === classId
    );
    
    if (existingAssignment) {
      const assignedTeacher = teachers.find(t => t.id === existingAssignment.teacherId);
      toast.error(
        `${subjects.find(s => s.id === subjectId)?.name} in ${classes.find(c => c.id === classId)?.name} is already assigned to ${assignedTeacher?.firstName} ${assignedTeacher?.lastName}`
      );
      return;
    }

    const exists = selectedAssignments.some((a) => a.subjectId === subjectId && a.classId === classId);
    if (exists) {
      setSelectedAssignments(selectedAssignments.filter((a) => !(a.subjectId === subjectId && a.classId === classId)));
    } else {
      setSelectedAssignments([...selectedAssignments, { subjectId, classId }]);
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedTeacherId) {
      toast.error('Please select a teacher');
      return;
    }

    if (selectedAssignments.length === 0) {
      toast.error('Please select at least one subject-class combination');
      return;
    }

    const teacher = teachers.find((t) => t.id === selectedTeacherId);
    if (!teacher) return;

    try {
      // Call backend API
      const result = await createTeacherAssignments(selectedTeacherId, selectedAssignments);
      
      const createdCount = result.created_count || 0;
      
      if (result.errors && result.errors.length > 0) {
        toast.error(`Some assignments failed: ${result.errors.join(', ')}`);
      } else {
        toast.success(`${createdCount} assignment(s) added for ${teacher.firstName} ${teacher.lastName}`);
      }
      
      setIsAssignDialogOpen(false);
      setSelectedTeacherId(null);
      setSelectedAssignments([]);
      setSelectedClassId(null);
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast.error('Failed to save assignments. Please try again.');
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    const assignment = subjectAssignments.find((a) => a.id === id);
    if (!assignment) return;

    try {
      // Call backend API to delete
      await deleteTeacherAssignment(id);
      
      toast.success(`Assignment removed: ${assignment.subjectName} - ${assignment.className}`);
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment. Please try again.');
    }
  };

  const handleOpenClassTeacherDialog = (teacherId?: number) => {
    if (teacherId) {
      setSelectedTeacherId(teacherId);
    }
    setSelectedClassForTeacher('');
    setIsClassTeacherDialogOpen(true);
  };

  const handleAssignClassTeacher = () => {
    if (!selectedTeacherId || !selectedClassForTeacher) {
      toast.error('Please select a teacher and a class');
      return;
    }

    const teacher = teachers.find(t => t.id === selectedTeacherId);
    const cls = classes.find(c => c.id === parseInt(selectedClassForTeacher));
    
    if (!teacher || !cls) return;

    // Check if class already has a class teacher (prevent duplicate assignment)
    if (cls.classTeacherId && cls.classTeacherId !== selectedTeacherId) {
      const currentTeacher = teachers.find(t => t.id === cls.classTeacherId);
      toast.error(`${cls.name} already has a class teacher: ${currentTeacher?.firstName} ${currentTeacher?.lastName}`);
      return;
    }

    // Update class to set class teacher
    updateClass(parseInt(selectedClassForTeacher), {
      classTeacherId: selectedTeacherId,
      classTeacher: `${teacher.firstName} ${teacher.lastName}`,
    });

    // Update teacher to mark as class teacher
    updateTeacher(selectedTeacherId, {
      isClassTeacher: true,
      classTeacherId: parseInt(selectedClassForTeacher),
    });

    toast.success(`${teacher.firstName} ${teacher.lastName} assigned as class teacher for ${cls.name}`);
    setIsClassTeacherDialogOpen(false);
    setSelectedTeacherId(null);
    setSelectedClassForTeacher('');
  };

  const handleRemoveClassTeacher = (classId: number) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls || !cls.classTeacherId) return;

    const teacherId = cls.classTeacherId;

    // Update class to remove class teacher
    updateClass(classId, {
      classTeacherId: null,
      classTeacher: '',
    });

    // Update teacher to remove class teacher status
    updateTeacher(teacherId, {
      isClassTeacher: false,
      classTeacherId: null,
    });

    const teacher = teachers.find(t => t.id === teacherId);
    toast.success(`Class teacher assignment removed for ${cls.name}`);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-white mb-2">Manage Teacher Assignments</h1>
        <p className="text-[#C0C8D3]">Assign teachers to subjects and classes</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-xl bg-[#F4F6F9] border border-gray-200 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-600 text-sm">Total Assignments</p>
              <BookOpen className="w-6 h-6 text-[#2563EB]" />
            </div>
            <p className="text-2xl text-gray-900">{stats.totalAssignments}</p>
            <p className="text-xs text-gray-500 mt-1">Subject-Class assignments</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-[#F4F6F9] border border-gray-200 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-600 text-sm">Active Teachers</p>
              <Users className="w-6 h-6 text-[#10B981]" />
            </div>
            <p className="text-2xl text-gray-900">{stats.uniqueTeachers}</p>
            <p className="text-xs text-gray-500 mt-1">With assignments</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-[#F4F6F9] border border-gray-200 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-600 text-sm">Subjects</p>
              <BookOpen className="w-6 h-6 text-[#3B82F6]" />
            </div>
            <p className="text-2xl text-gray-900">{stats.uniqueSubjects}</p>
            <p className="text-xs text-gray-500 mt-1">Being taught</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-[#F4F6F9] border border-gray-200 shadow-sm hover:shadow-md transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-600 text-sm">Classes</p>
              <Users className="w-6 h-6 text-[#EF4444]" />
            </div>
            <p className="text-2xl text-gray-900">{stats.uniqueClasses}</p>
            <p className="text-xs text-gray-500 mt-1">With teachers</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Session Alert */}
      <Alert className="border-blue-200 bg-blue-50 rounded-xl">
        <Clock className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Current Session:</strong> {currentAcademicYear} - {currentTerm}
          <br />
          <span className="text-sm text-blue-700">All assignments are created for the current session and term. Change session in System Settings.</span>
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button
          onClick={() => handleOpenAssignDialog()}
          className="bg-[#2563EB] hover:bg-[#1E40AF] text-white rounded-xl shadow-md hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          Assign Subject to Teacher
        </Button>
        <Button
          onClick={() => handleOpenClassTeacherDialog()}
          className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl shadow-md hover:scale-105 transition-all"
        >
          <Award className="w-5 h-5 mr-2" />
          Assign Class Teacher
        </Button>
      </div>

      {/* Class Teachers Overview */}
      <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 p-5">
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-green-600" />
            Class Teachers Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((cls) => (
              <Card key={cls.id} className="border-gray-200 rounded-xl">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-gray-900">{cls.name}</h4>
                    {cls.classTeacherId ? (
                      <Badge className="bg-green-100 text-green-800 rounded-xl">Assigned</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800 rounded-xl">No Teacher</Badge>
                    )}
                  </div>
                  {cls.classTeacherId ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">{cls.classTeacher}</p>
                      <Button
                        onClick={() => handleRemoveClassTeacher(cls.id)}
                        size="sm"
                        variant="destructive"
                        className="w-full rounded-xl text-xs"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        setSelectedClassForTeacher(cls.id.toString());
                        handleOpenClassTeacherDialog();
                      }}
                      size="sm"
                      variant="outline"
                      className="w-full rounded-xl text-xs border-gray-300"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Assign Teacher
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200 bg-gray-50 p-5 rounded-t-xl">
          <CardTitle className="text-gray-900">Subject Assignments</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-gray-700">Search Assignments</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search by teacher, subject, or class..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-11 rounded-xl border border-gray-300 bg-white text-gray-900"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Filter by Teacher</Label>
              <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="All" className="text-gray-900">
                    All Teachers
                  </SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id.toString()} className="text-gray-900">
                      {teacher.firstName} {teacher.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Filter by Class</Label>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="All" className="text-gray-900">
                    All Classes
                  </SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()} className="text-gray-900">
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => handleOpenAssignDialog()}
              className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Assignment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
        <CardHeader className="p-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg text-gray-900">All Assignments ({filteredAssignments.length})</h3>
            <Badge className="bg-[#2563EB] text-white border-0">
              {currentTerm} - {currentAcademicYear}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#2563EB] border-none hover:bg-[#2563EB]">
                  <TableHead className="text-white">Teacher</TableHead>
                  <TableHead className="text-white">Subject</TableHead>
                  <TableHead className="text-white">Class</TableHead>
                  <TableHead className="text-white">Term</TableHead>
                  <TableHead className="text-white text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.length === 0 ? (
                  <TableRow className="bg-white">
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <BookOpen className="w-12 h-12 text-gray-400" />
                        <p className="text-gray-900">No assignments found</p>
                        <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                      <TableCell className="text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2563EB] to-[#3B82F6] flex items-center justify-center">
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-gray-900">{assignment.teacherName}</p>
                            <p className="text-xs text-gray-500">Teacher ID: {assignment.teacherId}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-900">{assignment.subjectName}</TableCell>
                      <TableCell className="text-gray-900">
                        <Badge className="bg-[#3B82F6] text-white border-0">{assignment.className}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm">{assignment.term}</TableCell>
                      <TableCell className="text-center">
                        <Button
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-4xl rounded-xl bg-white border border-gray-200 text-gray-900 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Create Teacher Assignments</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Select Teacher *</Label>
              <Select
                value={selectedTeacherId?.toString() || ''}
                onValueChange={(value: string) => setSelectedTeacherId(parseInt(value))}
              >
                <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900">
                  <SelectValue placeholder="Choose a teacher" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id.toString()} className="text-gray-900">
                      {teacher.firstName} {teacher.lastName} - {teacher.specialization.join(', ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Filter by Class (Optional)</Label>
              <Select
                value={selectedClassId?.toString() || ''}
                onValueChange={(value: string) => setSelectedClassId(value ? parseInt(value) : null)}
              >
                <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="" className="text-gray-900">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()} className="text-gray-900">
                      {cls.name} - {cls.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Select Subject-Class Combinations *</Label>
              <div className="border border-gray-300 rounded-xl p-4 max-h-96 overflow-y-auto bg-gray-50">
                <div className="space-y-4">
                  {subjects.map((subject) => {
                    // Filter classes based on selected class if any
                    const classesToShow = selectedClassId 
                      ? classes.filter(cls => cls.id === selectedClassId)
                      : classes;
                    
                    if (classesToShow.length === 0) return null;
                    
                    return (
                      <div key={subject.id} className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-900 mb-3">
                          {subject.name} ({subject.code})
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {classesToShow.map((cls) => {
                            const isSelected = selectedAssignments.some(
                              (a) => a.subjectId === subject.id && a.classId === cls.id
                            );
                            const isAlreadyAssigned = subjectAssignments.some(
                              (a) => a.subjectId === subject.id && a.classId === cls.id
                            );
                            
                            return (
                              <div key={cls.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${subject.id}-${cls.id}`}
                                  checked={isSelected}
                                  disabled={isAlreadyAssigned}
                                  onCheckedChange={() => handleAddAssignment(subject.id, cls.id)}
                                  className={`border-gray-400 ${isAlreadyAssigned ? 'opacity-50 cursor-not-allowed' : ''}`}
                                />
                                <Label
                                  htmlFor={`${subject.id}-${cls.id}`}
                                  className={`text-sm cursor-pointer ${
                                    isAlreadyAssigned ? 'text-gray-400 line-through' : 'text-gray-700'
                                  }`}
                                >
                                  {cls.name}
                                  {isAlreadyAssigned && (
                                    <span className="text-xs text-red-500 ml-1">
                                      (Assigned)
                                    </span>
                                  )}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-900 text-sm mb-1">Assignment Guidelines</p>
                  <p className="text-gray-600 text-xs">
                    • Teachers can be assigned to multiple subjects and classes
                    <br />
                    • Each subject-class combination can have only one teacher
                    <br />
                    • Ensure teacher specialization matches assigned subjects
                    <br />• Assignments are for: {currentTerm} - {currentAcademicYear}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={() => {
                setIsAssignDialogOpen(false);
                setSelectedTeacherId(null);
                setSelectedAssignments([]);
                setSelectedClassId(null);
              }}
              variant="outline"
              className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAssignments}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl shadow-sm"
            >
              <Check className="w-4 h-4 mr-2" />
              Create Assignments ({selectedAssignments.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Class Teacher Assignment Dialog */}
      <Dialog open={isClassTeacherDialogOpen} onOpenChange={setIsClassTeacherDialogOpen}>
        <DialogContent className="max-w-md rounded-xl bg-white border border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-green-600" />
              Assign Class Teacher
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Assign a teacher as class teacher for a class. Maximum 3 classes per teacher.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Teacher Selection */}
            <div className="space-y-2">
              <Label className="text-gray-700">Select Teacher</Label>
              <Select 
                value={selectedTeacherId?.toString() || ''} 
                onValueChange={(value: string) => setSelectedTeacherId(parseInt(value))}
              >
                <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900">
                  <SelectValue placeholder="Choose a teacher..." />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {teachers
                    .filter((t) => t.status === 'Active')
                    .map((teacher) => {
                      const currentAssignments = getTeacherClassTeacherAssignments(teacher.id);
                      return (
                        <SelectItem 
                          key={teacher.id} 
                          value={teacher.id.toString()} 
                          className="text-gray-900"
                        >
                          {teacher.firstName} {teacher.lastName} - {teacher.employeeId}
                          {currentAssignments.length > 0 && (
                            <span className="text-xs text-green-600 ml-2">
                              ({currentAssignments.length} class{currentAssignments.length > 1 ? 'es' : ''})
                            </span>
                          )}
                        </SelectItem>
                      );
                    })}
                </SelectContent>
              </Select>
            </div>

            {/* Class Selection */}
            <div className="space-y-2">
              <Label className="text-gray-700">Select Class</Label>
              <Select 
                value={selectedClassForTeacher} 
                onValueChange={setSelectedClassForTeacher}
                disabled={!selectedTeacherId}
              >
                <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900">
                  <SelectValue placeholder={selectedTeacherId ? "Choose a class..." : "Select a teacher first"} />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {classes
                    .filter((c) => c.status?.toLowerCase() === 'active')
                    .map((cls) => (
                      <SelectItem 
                        key={cls.id} 
                        value={cls.id.toString()} 
                        className="text-gray-900"
                      >
                        {cls.name} - {cls.level}
                        {cls.classTeacherId && (
                          <span className="text-xs text-yellow-600 ml-2">
                            (Has teacher: {cls.classTeacher})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Info Alert */}
            {selectedTeacherId && (
              <Alert className="border-blue-200 bg-blue-50 rounded-xl">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  Teacher currently assigned to {getTeacherClassTeacherAssignments(selectedTeacherId).length} class(es).
                  <br />
                  Maximum limit: 3 classes per teacher.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <Button
              onClick={() => {
                setIsClassTeacherDialogOpen(false);
                setSelectedTeacherId(null);
                setSelectedClassForTeacher('');
              }}
              variant="outline"
              className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignClassTeacher}
              disabled={!selectedTeacherId || !selectedClassForTeacher}
              className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl shadow-sm"
            >
              <Check className="w-4 h-4 mr-2" />
              Assign Class Teacher
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
