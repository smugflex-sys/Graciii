import { useState } from "react";
import { Download, Eye, FileText } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";

export function PerformanceReportsPage() {
  const { 
    currentUser, 
    parents, 
    students, 
    compiledResults, 
    currentTerm,
    currentAcademicYear 
  } = useSchool();

  const [selectedChild, setSelectedChild] = useState("");
  const [selectedTerm, setSelectedTerm] = useState(currentTerm);
  const [selectedYear, setSelectedYear] = useState(currentAcademicYear);

  // Get current parent
  const currentParent = currentUser ? parents.find((p) => p.id === currentUser.linkedId) : null;

  // Get parent's children
  const children = currentParent
    ? students.filter((s) => currentParent.studentIds.includes(s.id))
    : [];

  const selectedStudent = children.find((c) => c.id === Number(selectedChild));

  // Get all results for selected student
  const studentResults = selectedStudent
    ? compiledResults.filter(r => r.studentId === selectedStudent.id && r.status === 'Approved')
    : [];

  // Get current term result
  const currentTermResult = selectedStudent
    ? compiledResults.find(
        r =>
          r.studentId === selectedStudent.id &&
          r.term === selectedTerm &&
          r.academicYear === selectedYear &&
          r.status === 'Approved'
      )
    : null;

  // Get scores for current term
  const currentTermScores = currentTermResult ? currentTermResult.scores : [];

  const handleDownload = (result: any) => {
    toast.success(`Downloading ${result.term} ${result.academicYear} report card...`);
  };

  const handleView = (result: any) => {
    toast.info(`Opening ${result.term} ${result.academicYear} detailed report...`);
  };

  const getGradeColor = (grade: string) => {
    if (grade === 'A') return 'bg-[#28A745]';
    if (grade === 'B') return 'bg-[#1E90FF]';
    if (grade === 'C') return 'bg-[#FFC107]';
    return 'bg-[#DC3545]';
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-white mb-2">Performance Reports</h1>
        <p className="text-[#C0C8D3]">View and download academic performance reports</p>
      </div>

      {/* Selection Filters */}
      <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-white">Select Child</label>
              <Select value={selectedChild} onValueChange={setSelectedChild}>
                <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                  <SelectValue placeholder="Choose child" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F243E] border-white/10">
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id.toString()} className="text-white hover:bg-[#1E90FF]">
                      {child.firstName} {child.lastName} - {child.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-white">Academic Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F243E] border-white/10">
                  <SelectItem value="2024/2025" className="text-white hover:bg-[#1E90FF]">2024/2025</SelectItem>
                  <SelectItem value="2023/2024" className="text-white hover:bg-[#1E90FF]">2023/2024</SelectItem>
                  <SelectItem value="2022/2023" className="text-white hover:bg-[#1E90FF]">2022/2023</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-white">Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F243E] border-white/10">
                  <SelectItem value="First Term" className="text-white hover:bg-[#1E90FF]">First Term</SelectItem>
                  <SelectItem value="Second Term" className="text-white hover:bg-[#1E90FF]">Second Term</SelectItem>
                  <SelectItem value="Third Term" className="text-white hover:bg-[#1E90FF]">Third Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedChild && currentTermResult ? (
        <>
          {/* Current Term Performance Summary */}
          <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
            <CardHeader className="p-5 border-b border-white/10">
              <h3 className="text-white">Current Term Performance Summary</h3>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 bg-[#0F243E] rounded-xl border border-white/5">
                  <p className="text-xs text-[#C0C8D3] mb-1">Average Score</p>
                  <p className="text-2xl text-white">{currentTermResult.averageScore.toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-[#0F243E] rounded-xl border border-white/5">
                  <p className="text-xs text-[#C0C8D3] mb-1">Position</p>
                  <p className="text-2xl text-[#FFD700]">
                    {currentTermResult.position}{currentTermResult.position === 1 ? 'st' : currentTermResult.position === 2 ? 'nd' : currentTermResult.position === 3 ? 'rd' : 'th'}
                  </p>
                </div>
                <div className="p-4 bg-[#0F243E] rounded-xl border border-white/5">
                  <p className="text-xs text-[#C0C8D3] mb-1">Out of</p>
                  <p className="text-2xl text-white">{currentTermResult.totalStudents}</p>
                </div>
                <div className="p-4 bg-[#0F243E] rounded-xl border border-white/5">
                  <p className="text-xs text-[#C0C8D3] mb-1">Attendance</p>
                  <p className="text-2xl text-[#28A745]">
                    {Math.round((currentTermResult.timesPresent / currentTermResult.totalAttendanceDays) * 100)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Term Detailed Scores */}
          <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
            <CardHeader className="p-5 border-b border-white/10">
              <h3 className="text-white">Subject Performance - {selectedTerm} {selectedYear}</h3>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-[#1E90FF] to-[#00BFFF] border-none hover:bg-gradient-to-r">
                      <TableHead className="text-white">Subject</TableHead>
                      <TableHead className="text-white text-center">1st CA (20)</TableHead>
                      <TableHead className="text-white text-center">2nd CA (20)</TableHead>
                      <TableHead className="text-white text-center">Exam (60)</TableHead>
                      <TableHead className="text-white text-center">Total (100)</TableHead>
                      <TableHead className="text-white text-center">Grade</TableHead>
                      <TableHead className="text-white text-center">Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentTermScores.length === 0 ? (
                      <TableRow className="bg-[#0F243E] border-b border-white/5">
                        <TableCell colSpan={7} className="text-center py-8">
                          <p className="text-white">No scores available for this term</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentTermScores.map((score, index) => (
                        <TableRow key={index} className="bg-[#0F243E] border-b border-white/5 hover:bg-[#132C4A]">
                          <TableCell className="text-white">{score.subjectName}</TableCell>
                          <TableCell className="text-center text-[#C0C8D3]">{score.ca1}</TableCell>
                          <TableCell className="text-center text-[#C0C8D3]">{score.ca2}</TableCell>
                          <TableCell className="text-center text-[#C0C8D3]">{score.exam}</TableCell>
                          <TableCell className="text-center text-white font-medium">{score.total}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${getGradeColor(score.grade)} text-white border-0`}>
                              {score.grade}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center text-[#C0C8D3]">{score.remark}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Historical Reports */}
          <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
            <CardHeader className="p-5 border-b border-white/10">
              <h3 className="text-white">Term Reports History</h3>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {studentResults.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-[#C0C8D3]" />
                  <p className="text-white mb-1">No approved results yet</p>
                  <p className="text-sm text-[#C0C8D3]">Results will appear here once approved by admin</p>
                </div>
              ) : (
                studentResults.map((result) => (
                  <div key={result.id} className="p-4 bg-[#0F243E] rounded-xl border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-white">{result.academicYear} - {result.term}</p>
                        <p className="text-xs text-[#C0C8D3]">Class Average: {result.averageScore.toFixed(1)}%</p>
                      </div>
                      <Badge className="bg-[#28A745] text-white border-0">
                        Approved
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="p-3 bg-[#132C4A] rounded-lg border border-white/5">
                        <p className="text-xs text-[#C0C8D3] mb-1">Average</p>
                        <p className="text-white">{result.averageScore.toFixed(1)}%</p>
                      </div>
                      <div className="p-3 bg-[#132C4A] rounded-lg border border-white/5">
                        <p className="text-xs text-[#C0C8D3] mb-1">Position</p>
                        <p className="text-[#FFD700]">
                          {result.position}{result.position === 1 ? 'st' : result.position === 2 ? 'nd' : result.position === 3 ? 'rd' : 'th'}
                        </p>
                      </div>
                      <div className="p-3 bg-[#132C4A] rounded-lg border border-white/5">
                        <p className="text-xs text-[#C0C8D3] mb-1">Out of</p>
                        <p className="text-white">{result.totalStudents}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleView(result)}
                        className="flex-1 bg-[#1E90FF] hover:bg-[#00BFFF] text-white rounded-xl shadow-md hover:scale-105 transition-all h-10"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                      <Button
                        onClick={() => handleDownload(result)}
                        className="flex-1 bg-[#28A745] hover:bg-[#28A745]/90 text-white rounded-xl shadow-md hover:scale-105 transition-all h-10"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      ) : selectedChild && !currentTermResult ? (
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-[#1E90FF]" />
            <h3 className="text-white mb-2">No Results Available</h3>
            <p className="text-[#C0C8D3]">
              No approved results for {selectedStudent?.firstName} {selectedStudent?.lastName} in {selectedTerm} {selectedYear}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-[#1E90FF]" />
            <h3 className="text-white mb-2">No Child Selected</h3>
            <p className="text-[#C0C8D3]">Please select a child to view their performance reports</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
