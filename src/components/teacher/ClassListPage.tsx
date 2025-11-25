import { useState, useMemo } from 'react';
import { Search, Download, Users, TrendingUp, Award, Mail, Phone, Eye } from 'lucide-react';
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
import { Avatar, AvatarFallback } from '../ui/avatar';
import { useSchool, Student as SchoolStudent } from '../../contexts/SchoolContext';

interface ExtendedStudent extends SchoolStudent {
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  attendance: number;
  averageScore: number;
  position: number;
}

export function ClassListPage() {
  const { 
    classes, 
    students: allStudents, 
    parents, 
    currentUser, 
    teachers, 
    getTeacherAssignments,
    compiledResults 
  } = useSchool();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<number>(classes[0]?.id || 1);
  const [genderFilter, setGenderFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<ExtendedStudent | null>(null);

  // Get teacher's assigned classes
  const currentTeacher = currentUser ? teachers.find(t => t.id === currentUser.linkedId) : null;
  const teacherAssignments = currentTeacher ? getTeacherAssignments(currentTeacher.id) : [];
  const assignedClassIds = teacherAssignments.map(a => a.classId);
  const teacherClasses = classes.filter(c => assignedClassIds.includes(c.id) || currentTeacher?.isClassTeacher);

  // Get current class
  const selectedClass = classes.find(c => c.id === selectedClassId) || classes[0];

  // Get students from the selected class with extended data
  const students: ExtendedStudent[] = useMemo(() => {
    return allStudents
      .filter(s => s.classId === selectedClassId && s.status === 'Active')
      .map((student, index) => {
        const parent = parents.find(p => p.id === student.parentId);
        const studentResults = compiledResults.filter(r => r.studentId === student.id && r.status === 'Approved');
        const averageScore = studentResults.length > 0 
          ? studentResults.reduce((sum, r) => sum + r.averageScore, 0) / studentResults.length 
          : 0;
        const attendancePercent = studentResults.length > 0
          ? Math.round(
              studentResults.reduce((sum, r) => {
                const totalDays = r.totalAttendanceDays > 0 ? r.totalAttendanceDays : (r.timesPresent + r.timesAbsent);
                if (totalDays > 0) {
                  return sum + (r.timesPresent / totalDays) * 100;
                }
                return sum;
              }, 0) / studentResults.length
            )
          : 0;
        
        return {
          ...student,
          parentName: parent ? `${parent.firstName} ${parent.lastName}` : 'N/A',
          parentPhone: parent?.phone || 'N/A',
          parentEmail: parent?.email || 'N/A',
          attendance: attendancePercent,
          averageScore: averageScore || 0, // Should come from API
          position: index + 1, // Will be recalculated based on scores
        };
      })
      .sort((a, b) => b.averageScore - a.averageScore)
      .map((student, index) => ({ ...student, position: index + 1 }));
  }, [allStudents, selectedClassId, parents, compiledResults]);

  // Old mock data removed

  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`;
    const matchesSearch = 
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.parentName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGender = genderFilter === 'all' || student.gender === genderFilter;
    
    return matchesSearch && matchesGender;
  });

  const classStats = {
    totalStudents: students.length,
    maleCount: students.filter(s => s.gender === 'Male').length,
    femaleCount: students.filter(s => s.gender === 'Female').length,
    averageAttendance: students.reduce((sum, s) => sum + s.attendance, 0) / students.length,
    averageScore: students.reduce((sum, s) => sum + s.averageScore, 0) / students.length,
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const exportToCSV = () => {
    const headers = ['Student ID', 'Name', 'Gender', 'DOB', 'Parent Name', 'Parent Phone', 'Parent Email', 'Attendance %', 'Average Score', 'Position'];
    const rows = filteredStudents.map(s => [
      s.admissionNumber, `${s.firstName} ${s.lastName}`, s.gender, new Date(s.dateOfBirth).toLocaleDateString('en-GB'), s.parentName, s.parentPhone, s.parentEmail, s.attendance, s.averageScore, s.position
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedClass?.name || 'class'}-class-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[#0A2540] mb-2">Class List - {selectedClass?.name || 'Select Class'}</h1>
          <p className="text-gray-600">Manage and view your class students</p>
        </div>
        <Select value={selectedClassId.toString()} onValueChange={(value: string) => setSelectedClassId(Number(value))}>
          <SelectTrigger className="w-48 border-[#0A2540]/20 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {teacherClasses.length > 0 ? (
              teacherClasses.map(cls => (
                <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
              ))
            ) : (
              classes.map(cls => (
                <SelectItem key={cls.id} value={cls.id.toString()}>{cls.name}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Students</p>
                <p className="text-[#0A2540]">{classStats.totalStudents}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Male</p>
                <p className="text-[#0A2540]">{classStats.maleCount}</p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-xl">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Female</p>
                <p className="text-[#0A2540]">{classStats.femaleCount}</p>
              </div>
              <div className="bg-pink-100 p-3 rounded-xl">
                <Users className="w-6 h-6 text-pink-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Avg Attendance</p>
                <p className="text-[#0A2540]">{classStats.averageAttendance.toFixed(1)}%</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#0A2540]/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Class Average</p>
                <p className="text-[#0A2540]">{classStats.averageScore.toFixed(1)}%</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-xl">
                <Award className="w-6 h-6 text-yellow-600" />
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
                placeholder="Search by name, ID, or parent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-[#0A2540]/20 focus:border-[#FFD700] rounded-xl"
              />
            </div>

            {/* Gender Filter */}
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="border-[#0A2540]/20 rounded-xl">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>

            {/* Export Button */}
            <Button 
              onClick={exportToCSV}
              className="bg-[#0A2540] hover:bg-[#0A2540]/90 text-white rounded-xl"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Class List
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="border-[#0A2540]/10">
        <CardHeader className="border-b border-[#0A2540]/10 bg-[#0A2540]/5">
          <CardTitle className="text-[#0A2540]">Students ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#0A2540]/5">
                  <TableHead className="text-[#0A2540]">Position</TableHead>
                  <TableHead className="text-[#0A2540]">Student</TableHead>
                  <TableHead className="text-[#0A2540]">Gender</TableHead>
                  <TableHead className="text-[#0A2540]">Parent/Guardian</TableHead>
                  <TableHead className="text-[#0A2540]">Contact</TableHead>
                  <TableHead className="text-[#0A2540]">Attendance</TableHead>
                  <TableHead className="text-[#0A2540]">Average Score</TableHead>
                  <TableHead className="text-[#0A2540]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id} className="hover:bg-[#0A2540]/5">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {student.position <= 3 && (
                            <Award className={`w-4 h-4 ${
                              student.position === 1 ? 'text-yellow-500' :
                              student.position === 2 ? 'text-gray-400' :
                              'text-orange-600'
                            }`} />
                          )}
                          <span className="text-[#0A2540]">{student.position}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 bg-[#0A2540] text-white">
                            <AvatarFallback className="bg-[#0A2540] text-white">
                              {getInitials(`${student.firstName} ${student.lastName}`)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-[#0A2540]">{student.firstName} {student.lastName}</p>
                            <p className="text-sm text-gray-500">{student.admissionNumber}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={student.gender === 'Male' ? 'default' : 'secondary'} className="rounded-xl">
                          {student.gender}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-[#0A2540]">{student.parentName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-600">{student.parentPhone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-600 truncate max-w-[200px]">{student.parentEmail}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 w-16">
                            <div 
                              className={`h-2 rounded-full ${
                                student.attendance >= 90 ? 'bg-green-500' :
                                student.attendance >= 75 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${student.attendance}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{student.attendance}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-[#0A2540]">{student.averageScore.toFixed(1)}%</span>
                          <Badge 
                            className={`rounded-xl ${
                              student.averageScore >= 70 ? 'bg-green-100 text-green-800' :
                              student.averageScore >= 50 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}
                          >
                            {student.averageScore >= 70 ? 'Excellent' :
                             student.averageScore >= 50 ? 'Good' : 'Needs Improvement'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedStudent(student)}
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

      {/* Student Details Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-[#0A2540]">Student Details</DialogTitle>
            <DialogDescription>
              Complete information for {selectedStudent && `${selectedStudent.firstName} ${selectedStudent.lastName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Student Info */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 bg-[#0A2540] text-white text-xl">
                <AvatarFallback className="bg-[#0A2540] text-white">
                  {selectedStudent && getInitials(`${selectedStudent.firstName} ${selectedStudent.lastName}`)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-[#0A2540]">{selectedStudent && `${selectedStudent.firstName} ${selectedStudent.lastName}`}</h3>
                <p className="text-gray-600">{selectedStudent?.admissionNumber}</p>
                <Badge variant="secondary" className="mt-1 rounded-xl">{selectedStudent?.gender}</Badge>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
              <div>
                <p className="text-gray-600 text-sm">Date of Birth</p>
                <p className="text-[#0A2540]">{selectedStudent && new Date(selectedStudent.dateOfBirth).toLocaleDateString('en-GB')}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Academic Year</p>
                <p className="text-[#0A2540]">{selectedStudent?.academicYear || '2024/2025'}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Class Position</p>
                <p className="text-[#0A2540]">{selectedStudent?.position} / {students.length}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Status</p>
                <Badge className="bg-green-100 text-green-800 rounded-xl">Active</Badge>
              </div>
            </div>

            {/* Performance */}
            <div className="space-y-2">
              <h4 className="text-[#0A2540]">Performance</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <p className="text-gray-600 text-sm">Average Score</p>
                  <p className="text-[#0A2540] text-xl">{selectedStudent?.averageScore.toFixed(1)}%</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <p className="text-gray-600 text-sm">Attendance Rate</p>
                  <p className="text-[#0A2540] text-xl">{selectedStudent?.attendance}%</p>
                </div>
              </div>
            </div>

            {/* Parent/Guardian Info */}
            <div className="space-y-2">
              <h4 className="text-[#0A2540]">Parent/Guardian Information</h4>
              <div className="bg-gray-50 p-4 rounded-xl space-y-3">
                <div>
                  <p className="text-gray-600 text-sm">Name</p>
                  <p className="text-[#0A2540]">{selectedStudent?.parentName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm">Phone</p>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <p className="text-[#0A2540]">{selectedStudent?.parentPhone}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <p className="text-[#0A2540]">{selectedStudent?.parentEmail}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Class</p>
                  <p className="text-[#0A2540]">{selectedStudent?.className}</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
