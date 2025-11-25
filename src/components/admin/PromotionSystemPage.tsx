import { useState } from "react";
import { 
  TrendingUp, Users, CheckCircle, XCircle, AlertTriangle, 
  ArrowRight, Search, Download, GraduationCap
} from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";

export function PromotionSystemPage() {
  const { 
    students, 
    classes, 
    compiledResults, 
    promoteMultipleStudents,
    addActivityLog,
    currentUser
  } = useSchool();

  const [selectedSourceClass, setSelectedSourceClass] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [promotionMapping, setPromotionMapping] = useState<{ [studentId: number]: number }>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [newAcademicYear, setNewAcademicYear] = useState("2025/2026");
  const [isPromoting, setIsPromoting] = useState(false);

  // Get students in selected class
  const classStudents = selectedSourceClass
    ? students.filter(s => s.classId === Number(selectedSourceClass) && s.status === 'Active')
    : [];

  // Get latest results for each student to determine promotion status
  const studentsWithStatus = classStudents.map(student => {
    const latestResult = compiledResults
      .filter(r => r.studentId === student.id && r.status === 'Approved')
      .sort((a, b) => new Date(b.compiledDate).getTime() - new Date(a.compiledDate).getTime())[0];

    let promotionStatus: "Promote" | "Trial" | "Repeat" = "Repeat";
    let averageScore = 0;
    let attendance = 0;

    if (latestResult) {
      averageScore = latestResult.averageScore;
      attendance = latestResult.totalAttendanceDays > 0 
        ? (latestResult.timesPresent / latestResult.totalAttendanceDays) * 100 
        : 0;

      if (averageScore >= 50 && attendance >= 75) {
        promotionStatus = "Promote";
      } else if (averageScore >= 40 && averageScore < 50) {
        promotionStatus = "Trial";
      } else {
        promotionStatus = "Repeat";
      }
    }

    return {
      ...student,
      averageScore,
      attendance,
      promotionStatus,
      position: latestResult?.position || 0,
      totalStudents: latestResult?.totalStudents || 0,
    };
  });

  // Apply filters
  const filteredStudents = studentsWithStatus.filter(student => {
    const matchesSearch = 
      student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = 
      filterStatus === "All" || 
      student.promotionStatus === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate summary
  const summary = {
    totalStudents: filteredStudents.length,
    toPromote: filteredStudents.filter(s => s.promotionStatus === "Promote").length,
    onTrial: filteredStudents.filter(s => s.promotionStatus === "Trial").length,
    toRepeat: filteredStudents.filter(s => s.promotionStatus === "Repeat").length,
    pending: filteredStudents.filter(s => s.averageScore === 0).length,
  };

  const handleSelectStudent = (studentId: number, isChecked: boolean) => {
    if (isChecked) {
      setSelectedStudents([...selectedStudents, studentId]);
    } else {
      setSelectedStudents(selectedStudents.filter(id => id !== studentId));
      const newMapping = { ...promotionMapping };
      delete newMapping[studentId];
      setPromotionMapping(newMapping);
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      const promotableStudents = filteredStudents
        .filter(s => s.promotionStatus === "Promote")
        .map(s => s.id);
      setSelectedStudents(promotableStudents);
    } else {
      setSelectedStudents([]);
      setPromotionMapping({});
    }
  };

  const handleSetDestinationClass = (studentId: number, classId: number) => {
    setPromotionMapping({
      ...promotionMapping,
      [studentId]: classId,
    });
  };

  const handlePromoteStudents = () => {
    if (selectedStudents.length === 0) {
      toast.error("Please select students to promote");
      return;
    }

    // Check if all selected students have destination classes
    const missingDestination = selectedStudents.filter(id => !promotionMapping[id]);
    if (missingDestination.length > 0) {
      toast.error("Please set destination class for all selected students");
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmPromotion = async () => {
    setIsPromoting(true);
    try {
      await promoteMultipleStudents(selectedStudents, promotionMapping, newAcademicYear);
      
      // Log activity
      if (currentUser) {
        addActivityLog({
          actor: currentUser.username || currentUser.name || 'Unknown',
          actorRole: 'Admin',
          action: 'Promote Students',
          target: `${selectedStudents.length} students promoted`,
          ip: 'System',
          status: 'Success',
          details: `Promoted ${selectedStudents.length} students from ${classes.find(c => c.id === Number(selectedSourceClass))?.name || 'Unknown Class'} to ${newAcademicYear}`,
        });
      }

      toast.success(`Successfully promoted ${selectedStudents.length} students!`);
      setShowConfirmDialog(false);
      setSelectedStudents([]);
      setPromotionMapping({});
    } catch (error) {
      console.error('Promotion error:', error);
      toast.error("Failed to promote students. Please try again.");
    } finally {
      setIsPromoting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Promote":
        return <Badge className="bg-[#28A745] text-white border-0"><CheckCircle className="w-3 h-3 mr-1" />Promote</Badge>;
      case "Trial":
        return <Badge className="bg-[#FFC107] text-white border-0"><AlertTriangle className="w-3 h-3 mr-1" />Trial</Badge>;
      case "Repeat":
        return <Badge className="bg-[#DC3545] text-white border-0"><XCircle className="w-3 h-3 mr-1" />Repeat</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white border-0">Pending</Badge>;
    }
  };

  const getNextClasses = (currentClassId: number) => {
    const currentClass = classes.find(c => c.id === currentClassId);
    if (!currentClass) return [];

    // Get classes from the same level or next level
    return classes.filter(c => {
      // For Primary classes
      if (currentClass.level === 'Primary') {
        const currentNum = parseInt(currentClass.name.match(/\d+/)?.[0] || '0');
        const nextNum = parseInt(c.name.match(/\d+/)?.[0] || '0');
        
        if (c.level === 'Primary' && nextNum === currentNum + 1) return true;
        if (c.level === 'Secondary' && currentClass.name.includes('6') && c.name.includes('JSS 1')) return true;
      }
      
      // For Secondary classes
      if (currentClass.level === 'Secondary') {
        const currentNum = parseInt(currentClass.name.match(/\d+/)?.[0] || '0');
        const nextNum = parseInt(c.name.match(/\d+/)?.[0] || '0');
        
        if (currentClass.name.includes('JSS') && c.name.includes('JSS') && nextNum === currentNum + 1) return true;
        if (currentClass.name === 'JSS 3' && c.name === 'SSS 1') return true;
        if (currentClass.name.includes('SSS') && c.name.includes('SSS') && nextNum === currentNum + 1) return true;
      }
      
      return false;
    });
  };

  const exportPromotionList = () => {
    const headers = ['Student Name', 'Admission No', 'Current Class', 'Average Score', 'Position', 'Attendance', 'Status', 'Next Class'];
    const rows = filteredStudents.map(s => {
      const nextClass = promotionMapping[s.id] ? classes.find(c => c.id === promotionMapping[s.id])?.name : '-';
      return [
        `${s.firstName} ${s.lastName}`,
        s.admissionNumber,
        s.className,
        s.averageScore.toFixed(1),
        `${s.position}/${s.totalStudents}`,
        `${s.attendance.toFixed(0)}%`,
        s.promotionStatus,
        nextClass || '-'
      ];
    });
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promotion-list-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Promotion list exported successfully");
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-white mb-2">Student Promotion System</h1>
        <p className="text-[#C0C8D3]">Promote students to next academic session</p>
      </div>

      {/* Summary Cards */}
      {selectedSourceClass && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-[#1E90FF]" />
                <p className="text-[#C0C8D3] text-sm">Total</p>
              </div>
              <p className="text-white text-2xl">{summary.totalStudents}</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-[#28A745]" />
                <p className="text-[#C0C8D3] text-sm">Promote</p>
              </div>
              <p className="text-[#28A745] text-2xl">{summary.toPromote}</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-[#FFC107]" />
                <p className="text-[#C0C8D3] text-sm">Trial</p>
              </div>
              <p className="text-[#FFC107] text-2xl">{summary.onTrial}</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-[#DC3545]" />
                <p className="text-[#C0C8D3] text-sm">Repeat</p>
              </div>
              <p className="text-[#DC3545] text-2xl">{summary.toRepeat}</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-[#1E90FF]" />
                <p className="text-[#C0C8D3] text-sm">Pending</p>
              </div>
              <p className="text-white text-2xl">{summary.pending}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-white">New Academic Year</Label>
              <Select value={newAcademicYear} onValueChange={setNewAcademicYear}>
                <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0F243E] border-white/10">
                  <SelectItem value="2025/2026" className="text-white hover:bg-[#1E90FF]">2025/2026</SelectItem>
                  <SelectItem value="2026/2027" className="text-white hover:bg-[#1E90FF]">2026/2027</SelectItem>
                  <SelectItem value="2027/2028" className="text-white hover:bg-[#1E90FF]">2027/2028</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Source Class *</Label>
              <Select value={selectedSourceClass} onValueChange={setSelectedSourceClass}>
                <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F243E] border-white/10">
                  {classes.filter(c => c.status?.toLowerCase() === 'active').map(cls => (
                    <SelectItem key={cls.id} value={cls.id.toString()} className="text-white hover:bg-[#1E90FF]">
                      {cls.name} ({students.filter(s => s.classId === cls.id && s.status === 'Active').length} students)
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
                  <SelectItem value="All" className="text-white hover:bg-[#1E90FF]">All Students</SelectItem>
                  <SelectItem value="Promote" className="text-white hover:bg-[#1E90FF]">Promote Only</SelectItem>
                  <SelectItem value="Trial" className="text-white hover:bg-[#1E90FF]">Trial Only</SelectItem>
                  <SelectItem value="Repeat" className="text-white hover:bg-[#1E90FF]">Repeat Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white">Search Student</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#C0C8D3]" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Name or Admission No..."
                  className="h-12 pl-10 rounded-xl border border-white/10 bg-[#0F243E] text-white"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      {selectedSourceClass ? (
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardHeader className="p-5 border-b border-white/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Students for Promotion ({filteredStudents.length})
              </h3>
              <div className="flex gap-2">
                <Button
                  onClick={exportPromotionList}
                  variant="outline"
                  className="h-10 border-white/10 text-white hover:bg-[#0F243E] rounded-xl"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  onClick={handlePromoteStudents}
                  disabled={selectedStudents.length === 0 || isPromoting}
                  className="h-10 bg-[#28A745] hover:bg-[#28A745]/90 text-white rounded-xl shadow-md"
                >
                  {isPromoting ? (
                    <>
                      <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Promoting...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Promote Selected ({selectedStudents.length})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-[#1E90FF] to-[#00BFFF] border-none hover:bg-gradient-to-r">
                    <TableHead className="text-white">
                      <Checkbox
                        checked={selectedStudents.length === filteredStudents.filter(s => s.promotionStatus === "Promote").length}
                        onCheckedChange={handleSelectAll}
                        className="border-white"
                      />
                    </TableHead>
                    <TableHead className="text-white">Student</TableHead>
                    <TableHead className="text-white">Adm. No</TableHead>
                    <TableHead className="text-white text-center">Average</TableHead>
                    <TableHead className="text-white text-center">Position</TableHead>
                    <TableHead className="text-white text-center">Attendance</TableHead>
                    <TableHead className="text-white">Status</TableHead>
                    <TableHead className="text-white">Destination Class</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow className="bg-[#0F243E] border-b border-white/5">
                      <TableCell colSpan={8} className="text-center py-12">
                        <p className="text-white mb-2">No students found</p>
                        <p className="text-[#C0C8D3] text-sm">Try adjusting your filters</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => {
                      const nextClasses = getNextClasses(student.classId);
                      return (
                        <TableRow key={student.id} className="bg-[#0F243E] border-b border-white/5 hover:bg-[#132C4A]">
                          <TableCell>
                            <Checkbox
                              checked={selectedStudents.includes(student.id)}
                              onCheckedChange={(checked: boolean) => handleSelectStudent(student.id, checked)}
                              disabled={student.promotionStatus === "Repeat"}
                              className="border-white/20"
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-white">{student.firstName} {student.lastName}</p>
                              <p className="text-xs text-[#C0C8D3]">{student.className}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-[#C0C8D3]">{student.admissionNumber}</TableCell>
                          <TableCell className="text-center text-white">{student.averageScore.toFixed(1)}%</TableCell>
                          <TableCell className="text-center text-[#FFD700]">
                            {student.position > 0 ? `${student.position}/${student.totalStudents}` : '-'}
                          </TableCell>
                          <TableCell className="text-center text-[#C0C8D3]">{student.attendance.toFixed(0)}%</TableCell>
                          <TableCell>{getStatusBadge(student.promotionStatus)}</TableCell>
                          <TableCell>
                            {selectedStudents.includes(student.id) ? (
                              <Select
                                value={promotionMapping[student.id]?.toString() || ''}
                                onValueChange={(value: string) => handleSetDestinationClass(student.id, Number(value))}
                              >
                                <SelectTrigger className="h-10 w-full rounded-xl border border-white/10 bg-[#132C4A] text-white">
                                  <SelectValue placeholder="Select class" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#0F243E] border-white/10">
                                  {nextClasses.map(cls => (
                                    <SelectItem key={cls.id} value={cls.id.toString()} className="text-white hover:bg-[#1E90FF]">
                                      {cls.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-[#C0C8D3]">-</span>
                            )}
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
      ) : (
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-12 text-center">
            <GraduationCap className="w-16 h-16 mx-auto mb-4 text-[#1E90FF]" />
            <h3 className="text-white mb-2">Select a Source Class</h3>
            <p className="text-[#C0C8D3]">Choose a class from the dropdown above to view students for promotion</p>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-[#0F243E] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirm Student Promotion</AlertDialogTitle>
            <AlertDialogDescription className="text-[#C0C8D3]">
              You are about to promote {selectedStudents.length} student(s) to the {newAcademicYear} academic year.
              This action will update their class assignments and academic year records.
              <br /><br />
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#132C4A] text-white border-white/10 hover:bg-[#132C4A]/80">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPromotion}
              disabled={isPromoting}
              className="bg-[#28A745] hover:bg-[#28A745]/90 text-white"
            >
              {isPromoting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                'Confirm Promotion'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
