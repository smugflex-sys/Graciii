import { useState, useEffect } from 'react';
import { useSchool } from '../../contexts/SchoolContext';
import { Printer, Download, AlertCircle, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { StudentResultSheet } from '../StudentResultSheet';

export function ViewResultsPage() {
  const {
    currentUser,
    students,
    parents,
    classes,
    compiledResults,
    subjectAssignments,
    affectiveDomains,
    psychomotorDomains,
    currentTerm,
    currentAcademicYear,
    fetchCompiledResults,
  } = useSchool();

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedTerm, setSelectedTerm] = useState(currentTerm);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(currentAcademicYear);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewResultId, setPreviewResultId] = useState<number | null>(null);
  const [showPDFSheet, setShowPDFSheet] = useState(false);
  const [pdfResultId, setPdfResultId] = useState<number | null>(null);

  // Load compiled results from backend on mount
  useEffect(() => {
    fetchCompiledResults().catch(() => {
      // errors handled in context
    });
  }, []);

  // Get current parent
  const currentParent = currentUser ? parents.find((p) => p.id === currentUser.linkedId) : null;

  // Get parent's children
  const parentStudents = currentParent
    ? students.filter((s) => currentParent.studentIds.includes(s.id))
    : [];

  // Get approved results for selected student
  const studentResults = selectedStudentId
    ? compiledResults.filter(
        (r) =>
          r.studentId === selectedStudentId &&
          r.term === selectedTerm &&
          r.academicYear === selectedAcademicYear &&
          r.status === 'Approved'
      )
    : [];

  const selectedResult = previewResultId
    ? compiledResults.find((r) => r.id === previewResultId)
    : null;

  const handlePrintResult = (resultId: number) => {
    setPdfResultId(resultId);
    setShowPDFSheet(true);
    setIsPreviewOpen(false);
  };

  const handleDownloadResult = (resultId: number) => {
    setPdfResultId(resultId);
    setShowPDFSheet(true);
  };

  const handlePreview = (resultId: number) => {
    setPreviewResultId(resultId);
    setIsPreviewOpen(true);
  };

  // Show PDF sheet if requested
  const pdfResult = pdfResultId ? compiledResults.find(r => r.id === pdfResultId) : null;
  if (showPDFSheet && pdfResult) {
    return <StudentResultSheet result={pdfResult} onClose={() => setShowPDFSheet(false)} />;
  }

  if (!currentParent) {
    return (
      <div className="space-y-6">
        <Alert className="bg-yellow-50 border-yellow-200 rounded-xl">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-gray-900">
            Parent account not found. Please contact the school administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (parentStudents.length === 0) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl text-gray-900 mb-2">View Results</h1>
          <p className="text-gray-600">Access your children's academic results</p>
        </div>

        <Alert className="bg-blue-50 border-blue-200 rounded-xl">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-gray-900">
            No children linked to your account. Please contact the school administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900 mb-2">View Results</h1>
        <p className="text-gray-600">Access and print your children's approved academic results</p>
      </div>

      {/* Filters */}
      <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
        <CardContent className="p-5">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Select Child</Label>
              <Select
                value={selectedStudentId?.toString() || ''}
                onValueChange={(value: string) => setSelectedStudentId(parseInt(value))}
              >
                <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900">
                  <SelectValue placeholder="Choose a child" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {parentStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id.toString()} className="text-gray-900">
                      {student.firstName} {student.lastName} - {student.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Academic Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="First Term" className="text-gray-900">
                    First Term
                  </SelectItem>
                  <SelectItem value="Second Term" className="text-gray-900">
                    Second Term
                  </SelectItem>
                  <SelectItem value="Third Term" className="text-gray-900">
                    Third Term
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Academic Year</Label>
              <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="2024/2025" className="text-gray-900">
                    2024/2025
                  </SelectItem>
                  <SelectItem value="2023/2024" className="text-gray-900">
                    2023/2024
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Display */}
      {selectedStudentId ? (
        studentResults.length > 0 ? (
          <div className="space-y-4">
            {studentResults.map((result) => {
              const student = students.find((s) => s.id === result.studentId);
              const classData = classes.find((c) => c.id === result.classId);

              return (
                <Card key={result.id} className="rounded-xl bg-white border border-gray-200 shadow-sm">
                  <CardHeader className="p-5 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg text-gray-900">
                          {student?.firstName} {student?.lastName} - {classData?.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {result.term} - {result.academicYear}
                        </p>
                      </div>
                      <Badge className="bg-[#10B981] text-white border-0">Approved</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="grid md:grid-cols-4 gap-4 mb-4">
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <p className="text-sm text-gray-600 mb-1">Total Score</p>
                        <p className="text-2xl text-gray-900">{result.totalScore}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-xl">
                        <p className="text-sm text-gray-600 mb-1">Average</p>
                        <p className="text-2xl text-[#2563EB]">{result.averageScore.toFixed(1)}%</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-xl">
                        <p className="text-sm text-gray-600 mb-1">Position</p>
                        <p className="text-2xl text-[#10B981]">
                          {result.position}/{result.totalStudents}
                        </p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-xl">
                        <p className="text-sm text-gray-600 mb-1">No. of Subjects</p>
                        <p className="text-2xl text-purple-600">{result.scores.length}</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => handlePreview(result.id)}
                        className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview Result
                      </Button>
                      <Button
                        onClick={() => handlePrintResult(result.id)}
                        className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl"
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Print Result
                      </Button>
                      <Button
                        onClick={() => handleDownloadResult(result.id)}
                        variant="outline"
                        className="rounded-xl border-gray-300 text-gray-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Alert className="bg-yellow-50 border-yellow-200 rounded-xl">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-gray-900">
              No approved results available for the selected term and academic year.
              <br />
              Results will appear here once approved by the school administrator.
            </AlertDescription>
          </Alert>
        )
      ) : (
        <Alert className="bg-blue-50 border-blue-200 rounded-xl">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-gray-900">
            Please select a child to view their results.
          </AlertDescription>
        </Alert>
      )}

      {/* Result Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl rounded-xl bg-white border border-gray-200 text-gray-900 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Student Result - Official Report Card</DialogTitle>
          </DialogHeader>

          {selectedResult && (
            <div className="space-y-6 py-4">
              {(() => {
                const student = students.find((s) => s.id === selectedResult.studentId);
                const classData = classes.find((c) => c.id === selectedResult.classId);
                const affective = affectiveDomains.find(
                  (a) =>
                    a.studentId === selectedResult.studentId &&
                    a.term === selectedResult.term &&
                    a.academicYear === selectedResult.academicYear
                );
                const psychomotor = psychomotorDomains.find(
                  (p) =>
                    p.studentId === selectedResult.studentId &&
                    p.term === selectedResult.term &&
                    p.academicYear === selectedResult.academicYear
                );

                return (
                  <>
                    {/* School Header */}
                    <div className="text-center border-b border-gray-200 pb-4">
                      <h2 className="text-2xl text-gray-900 font-bold">Graceland Royal Academy Gombe</h2>
                      <p className="text-sm text-gray-600 italic">Wisdom & Illumination</p>
                      <p className="text-sm text-gray-600 mt-2">
                        {selectedResult.term} - {selectedResult.academicYear} Academic Report
                      </p>
                    </div>

                    {/* Student Info */}
                    <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm text-gray-600">Student Name:</p>
                        <p className="text-lg text-gray-900 font-medium">
                          {student?.firstName} {student?.lastName}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Admission Number:</p>
                        <p className="text-lg text-gray-900 font-medium">{student?.admissionNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Class:</p>
                        <p className="text-lg text-gray-900 font-medium">{classData?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Position:</p>
                        <p className="text-lg text-gray-900 font-medium">
                          {selectedResult.position} out of {selectedResult.totalStudents}
                        </p>
                      </div>
                    </div>

                    {/* Subject Scores */}
                    <div>
                      <h4 className="text-md text-gray-900 font-medium mb-2">Academic Performance</h4>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-[#2563EB]">
                              <TableHead className="text-white">Subject</TableHead>
                              <TableHead className="text-white text-center">CA1 (20)</TableHead>
                              <TableHead className="text-white text-center">CA2 (20)</TableHead>
                              <TableHead className="text-white text-center">Exam (60)</TableHead>
                              <TableHead className="text-white text-center">Total (100)</TableHead>
                              <TableHead className="text-white text-center">Grade</TableHead>
                              <TableHead className="text-white">Remark</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedResult.scores.map((score) => {
                              const assignment = subjectAssignments.find(
                                (a) => a.id === score.subjectAssignmentId
                              );
                              return (
                                <TableRow key={score.id} className="border-b border-gray-100">
                                  <TableCell className="text-gray-900 font-medium">
                                    {assignment?.subjectName}
                                  </TableCell>
                                  <TableCell className="text-center text-gray-900">{score.ca1}</TableCell>
                                  <TableCell className="text-center text-gray-900">{score.ca2}</TableCell>
                                  <TableCell className="text-center text-gray-900">{score.exam}</TableCell>
                                  <TableCell className="text-center text-gray-900 font-medium">
                                    {score.total}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge className="bg-[#10B981] text-white border-0">{score.grade}</Badge>
                                  </TableCell>
                                  <TableCell className="text-gray-600 text-sm">{score.remark}</TableCell>
                                </TableRow>
                              );
                            })}
                            <TableRow className="bg-blue-50 font-medium">
                              <TableCell colSpan={4} className="text-gray-900">
                                <strong>Total/Average</strong>
                              </TableCell>
                              <TableCell className="text-center text-gray-900">
                                <strong>{selectedResult.averageScore.toFixed(1)}%</strong>
                              </TableCell>
                              <TableCell colSpan={2}></TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    {/* Affective & Psychomotor */}
                    {(affective || psychomotor) && (
                      <div className="grid md:grid-cols-2 gap-4">
                        {affective && (
                          <div>
                            <h4 className="text-md text-gray-900 font-medium mb-2">Affective Domain</h4>
                            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-700">Attentiveness:</span>
                                <span className="text-gray-900 font-medium">{affective.attentiveness}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-700">Honesty:</span>
                                <span className="text-gray-900 font-medium">{affective.honesty}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-700">Neatness:</span>
                                <span className="text-gray-900 font-medium">{affective.neatness}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-700">Obedience:</span>
                                <span className="text-gray-900 font-medium">{affective.obedience}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-700">Sense of Responsibility:</span>
                                <span className="text-gray-900 font-medium">{affective.senseOfResponsibility}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {psychomotor && (
                          <div>
                            <h4 className="text-md text-gray-900 font-medium mb-2">Psychomotor Domain</h4>
                            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-700">Attention to Direction:</span>
                                <span className="text-gray-900 font-medium">{psychomotor.attentionToDirection}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-700">Considerate of Others:</span>
                                <span className="text-gray-900 font-medium">{psychomotor.considerateOfOthers}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-700">Handwriting:</span>
                                <span className="text-gray-900 font-medium">{psychomotor.handwriting}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-700">Sports:</span>
                                <span className="text-gray-900 font-medium">{psychomotor.sports}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-700">Verbal Fluency:</span>
                                <span className="text-gray-900 font-medium">{psychomotor.verbalFluency}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-700">Works Well Independently:</span>
                                <span className="text-gray-900 font-medium">{psychomotor.worksWellIndependently}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Class Teacher's Comment */}
                    <div>
                      <h4 className="text-md text-gray-900 font-medium mb-2">Class Teacher's Comment</h4>
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-700 italic">{selectedResult.classTeacherComment}</p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-200 pt-4 text-sm text-gray-600">
                      <p>
                        Compiled: {new Date(selectedResult.compiledDate).toLocaleDateString()}
                      </p>
                      <p>Status: <span className="text-green-600 font-medium">Approved by Admin</span></p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => setIsPreviewOpen(false)}
              variant="outline"
              className="rounded-xl border-gray-300 text-gray-700"
            >
              Close
            </Button>
            {selectedResult && (
              <Button
                onClick={() => {
                  handlePrintResult(selectedResult.id);
                  setIsPreviewOpen(false);
                }}
                className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Result
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
