import { useState, useMemo, useEffect } from "react";
import { 
  Upload, 
  Download, 
  Save, 
  Send, 
  Filter, 
  AlertCircle,
  Lock,
  FileSpreadsheet,
  Loader2,
  CheckCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { useSchool } from "../../contexts/SchoolContext";
import { scoresAPI, classesAPI } from "../../services/apiService";
import { toast } from "sonner";

export function ScoreEntryPage() {
  const {
    currentUser,
    teachers,
    students,
    classes,
    getTeacherAssignments,
    scores,
    addScore,
    updateScore,
    currentTerm,
    currentAcademicYear,
    currentTermId,
    currentSessionId,
    createNotification,
    getClassRegisteredSubjects,
    subjects
  } = useSchool();

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [scoresData, setScoresData] = useState<Record<number, { ca1: string; ca2: string; exam: string }>>({});
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [submittingStatus, setSubmittingStatus] = useState<'idle' | 'submitting' | 'submitted'>('idle');
  const [classSubjectIds, setClassSubjectIds] = useState<number[]>([]);

  // Get current teacher
  const currentTeacher = currentUser ? teachers.find(t => t.id === currentUser.linkedId) : null;
  const teacherAssignments = currentTeacher ? getTeacherAssignments(currentTeacher.id) : [];

  // Load registered subjects for selected class and term
  useEffect(() => {
    const loadRegisteredSubjects = () => {
      if (!selectedClassId) {
        setClassSubjectIds([]);
        return;
      }

      try {
        // Get subjects registered for this class in the current term and academic year
        const registeredSubjects = getClassRegisteredSubjects(
          Number(selectedClassId),
          currentTerm,
          currentAcademicYear
        );
        
        // Extract subject IDs from registrations
        const subjectIds = registeredSubjects.map(reg => reg.subjectId);
        setClassSubjectIds(subjectIds);
      } catch (error) {
        console.error('Error loading registered subjects:', error);
        setClassSubjectIds([]);
      }
    };

    loadRegisteredSubjects();
  }, [selectedClassId, currentTerm, currentAcademicYear, getClassRegisteredSubjects]);

  // Get unique classes from assignments
  const assignedClasses = useMemo(() => {
    const classMap = new Map();
    teacherAssignments.forEach(assignment => {
      if (!classMap.has(assignment.classId)) {
        classMap.set(assignment.classId, {
          id: assignment.classId,
          name: assignment.className
        });
      }
    });
    return Array.from(classMap.values());
  }, [teacherAssignments]);

  // Get subjects for selected class (intersect teacher assignments with backend class subjects, if available)
  const availableSubjects = useMemo(() => {
    if (!selectedClassId) return [];
    return teacherAssignments.filter(a => 
      a.classId === Number(selectedClassId) &&
      (classSubjectIds.length === 0 || classSubjectIds.includes(a.subjectId))
    );
  }, [selectedClassId, teacherAssignments, classSubjectIds]);

  // Get students for selected class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    return students
      .filter(s => s.classId === Number(selectedClassId) && s.status === 'Active')
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [selectedClassId, students]);

  // Get existing scores
  const existingScores = useMemo(() => {
    if (!selectedSubjectId || !selectedClassId) return [];
    const assignment = teacherAssignments.find(
      a => a.subjectId === Number(selectedSubjectId) && a.classId === Number(selectedClassId)
    );
    if (!assignment) return [];
    return scores.filter(s => s.subjectAssignmentId === assignment.id);
  }, [selectedSubjectId, selectedClassId, teacherAssignments, scores]);

  // Check if locked
  const isLocked = existingScores.length > 0 && existingScores[0]?.status === 'Submitted';

  // Initialize scores data when component loads or selection changes
  useEffect(() => {
    const initialData: Record<number, { ca1: string; ca2: string; exam: string }> = {};
    classStudents.forEach(student => {
      const existingScore = existingScores.find(s => s.studentId === student.id);
      initialData[student.id] = {
        ca1: existingScore?.ca1?.toString() || "",
        ca2: existingScore?.ca2?.toString() || "",
        exam: existingScore?.exam?.toString() || ""
      };
    });
    setScoresData(initialData);
  }, [selectedClassId, selectedSubjectId]);

  // Calculate totals and grades (70-based A–F scale)
  const calculateScore = (ca1: string, ca2: string, exam: string) => {
    const c1 = parseFloat(ca1) || 0;
    const c2 = parseFloat(ca2) || 0;
    const ex = parseFloat(exam) || 0;
    const total = c1 + c2 + ex;

    let grade = '';
    let remark = '';

    if (total >= 70) {
      grade = 'A';
      remark = 'Excellent';
    } else if (total >= 60) {
      grade = 'B';
      remark = 'Very Good';
    } else if (total >= 50) {
      grade = 'C';
      remark = 'Good';
    } else if (total >= 45) {
      grade = 'D';
      remark = 'Fair';
    } else if (total >= 40) {
      grade = 'E';
      remark = 'Poor';
    } else {
      grade = 'F';
      remark = 'Very Poor';
    }

    return { total, grade, remark };
  };

  // Handle score input change
  const handleScoreChange = (studentId: number, field: 'ca1' | 'ca2' | 'exam', value: string) => {
    // Validate input
    const numValue = parseFloat(value);
    const maxValue = field === 'exam' ? 60 : 20;
    
    if (value && (isNaN(numValue) || numValue < 0 || numValue > maxValue)) {
      toast.error(`${field.toUpperCase()} must be between 0 and ${maxValue}`);
      return;
    }

    setScoresData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
    setSavingStatus('idle');
  };

  // Save as draft
  const handleSaveDraft = () => {
    if (!selectedClassId || !selectedSubjectId || !currentTeacher) {
      toast.error("Please select class and subject");
      return;
    }

    setSavingStatus('saving');
    let savedCount = 0;

    const assignment = teacherAssignments.find(
      a => a.subjectId === Number(selectedSubjectId) && a.classId === Number(selectedClassId)
    );

    if (!assignment) {
      toast.error("Assignment not found");
      setSavingStatus('idle');
      return;
    }

    classStudents.forEach(student => {
      const data = scoresData[student.id];
      if (!data || (!data.ca1 && !data.ca2 && !data.exam)) return;

      const { total, grade, remark } = calculateScore(data.ca1, data.ca2, data.exam);
      
      const existingScore = existingScores.find(s => s.studentId === student.id);

      const scoreData = {
        studentId: student.id,
        subjectAssignmentId: assignment.id,
        subjectName: assignment.subjectName,
        ca1: parseFloat(data.ca1) || 0,
        ca2: parseFloat(data.ca2) || 0,
        exam: parseFloat(data.exam) || 0,
        total,
        classAverage: 0,
        classMin: 0,
        classMax: 0,
        grade,
        remark,
        subjectTeacher: `${currentTeacher.firstName} ${currentTeacher.lastName}`,
        enteredBy: currentTeacher.id,
        enteredDate: new Date().toISOString(),
        term: currentTerm, // Add missing term field
        academicYear: currentAcademicYear, // Add missing academicYear field
        status: 'Draft' as const
      };

      if (existingScore) {
        updateScore(existingScore.id, scoreData);
      } else {
        addScore(scoreData);
      }
      savedCount++;
    });

    setSavingStatus('saved');
    toast.success(`Draft saved for ${savedCount} students`);
    setTimeout(() => setSavingStatus('idle'), 2000);
  };

  // Submit scores
  const handleSubmit = async () => {
    if (!selectedClassId || !selectedSubjectId || !currentTeacher) {
      toast.error("Please select class and subject");
      return;
    }

    if (!currentSessionId || !currentTermId) {
      toast.error("Active academic session or term is not set. Please contact the administrator.");
      return;
    }

    // Validate all scores are entered
    const missingScores = classStudents.filter(student => {
      const data = scoresData[student.id];
      return !data || !data.ca1 || !data.ca2 || !data.exam;
    });

    if (missingScores.length > 0) {
      toast.error(`Please enter all scores for all ${classStudents.length} students before submitting`);
      return;
    }

    setSubmittingStatus('submitting');
    try {
      const assignment = teacherAssignments.find(
        a => a.subjectId === Number(selectedSubjectId) && a.classId === Number(selectedClassId)
      );

      if (!assignment) {
        toast.error("Assignment not found");
        setSubmittingStatus('idle');
        return;
      }

      // Calculate class statistics
      const allTotals = classStudents.map(student => {
        const data = scoresData[student.id];
        return calculateScore(data.ca1, data.ca2, data.exam).total;
      });

      const classMax = Math.max(...allTotals);
      const classMin = Math.min(...allTotals);
      const classAverage = allTotals.reduce((sum, t) => sum + t, 0) / allTotals.length;

      // Prepare payload for backend bulk save (CA + Exam)
      const payloadScores: any[] = [];

      // Save all scores locally and build backend payload
      classStudents.forEach((student) => {
        const data = scoresData[student.id];
        const { total, grade, remark } = calculateScore(data.ca1, data.ca2, data.exam);
        
        const existingScore = existingScores.find(s => s.studentId === student.id);

        const scoreData = {
          studentId: student.id,
          subjectAssignmentId: assignment.id,
          subjectName: assignment.subjectName,
          ca1: parseFloat(data.ca1),
          ca2: parseFloat(data.ca2),
          exam: parseFloat(data.exam),
          total,
          classAverage: Math.round(classAverage * 100) / 100,
          classMin,
          classMax,
          grade,
          remark,
          subjectTeacher: `${currentTeacher.firstName} ${currentTeacher.lastName}`,
          enteredBy: currentTeacher.id,
          enteredDate: new Date().toISOString(),
          term: currentTerm,
          academicYear: currentAcademicYear,
          status: 'Submitted' as const
        };

        if (existingScore) {
          updateScore(existingScore.id, scoreData);
        } else {
          addScore(scoreData);
        }

        // Build backend payload item (CA1 + CA2 stored as ca_score, Exam as exam_score)
        payloadScores.push({
          student_id: student.id,
          subject_id: assignment.subjectId,
          class_id: assignment.classId,
          session_id: currentSessionId,
          term_id: currentTermId,
          score: total,
          teacher_id: currentTeacher.id,
          status: 'submitted'
        });
      });

      // Send scores to backend in bulk
      if (payloadScores.length > 0) {
        await scoresAPI.bulkCreate(payloadScores as any);
      }
      
      setSubmittingStatus('submitted');
      toast.success(`Scores submitted successfully for ${assignment.className} - ${assignment.subjectName}`);
      setTimeout(() => setSubmittingStatus('idle'), 2000);

      // Find class teacher for notification
      const classInfo = classes.find(c => c.id === Number(selectedClassId));
      if (classInfo && classInfo.classTeacherId) {
        createNotification({
          title: "New Subject Scores Submitted",
          message: `${currentTeacher.firstName} ${currentTeacher.lastName} has submitted ${assignment.subjectName} scores for ${assignment.className}`,
          type: "info",
          targetAudience: "teachers",
          sentBy: currentUser!.id
        });
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Scores saved locally but failed to sync with server. Please retry later.';
      console.error('Error submitting scores to backend:', error);
      toast.error(errorMsg);
      setSubmittingStatus('idle');
      return;
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!selectedClassId || !selectedSubjectId) {
      toast.error("Please select class and subject first");
      return;
    }

    const assignment = teacherAssignments.find(
      a => a.subjectId === Number(selectedSubjectId) && a.classId === Number(selectedClassId)
    );

    if (!assignment) return;

    let csv = `Student Name,Admission Number,CA1 (Max 20),CA2 (Max 20),Exam (Max 60)\n`;
    
    classStudents.forEach(student => {
      const data = scoresData[student.id] || { ca1: '', ca2: '', exam: '' };
      csv += `${student.firstName} ${student.lastName},${student.admissionNumber},${data.ca1},${data.ca2},${data.exam}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assignment.className}_${assignment.subjectName}_${currentTerm}_${currentAcademicYear}.csv`;
    a.click();
    
    toast.success("CSV exported successfully!");
  };

  // Import from CSV
  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error("Invalid CSV file");
        return;
      }

      // Skip header
      const dataLines = lines.slice(1);
      let importedCount = 0;
      let errorCount = 0;

      dataLines.forEach(line => {
        const parts = line.split(',');
        if (parts.length < 5) return;

        const [, admNum, ca1, ca2, exam] = parts.map(p => p.trim());
        
        // Find student
        const student = classStudents.find(s => s.admissionNumber === admNum);
        if (!student) {
          errorCount++;
          return;
        }

        // Validate scores
        const c1 = parseFloat(ca1);
        const c2 = parseFloat(ca2);
        const ex = parseFloat(exam);

        if (isNaN(c1) || c1 < 0 || c1 > 20 ||
            isNaN(c2) || c2 < 0 || c2 > 20 ||
            isNaN(ex) || ex < 0 || ex > 60) {
          errorCount++;
          return;
        }

        setScoresData(prev => ({
          ...prev,
          [student.id]: {
            ca1: ca1,
            ca2: ca2,
            exam: exam
          }
        }));
        importedCount++;
      });

      if (importedCount > 0) {
        toast.success(`Imported ${importedCount} student scores`);
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} entries had errors and were skipped`);
      }
    };

    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Enter Scores</h1>
        <p className="text-[#6B7280]">Record CA and Exam scores for your assigned subjects</p>
      </div>

      {/* Selection Filters */}
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-6 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-[#2563EB]" />
            <CardTitle className="text-[#1F2937]">Select Class & Subject</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-[#1F2937] mb-2 block">Class</Label>
              <Select value={selectedClassId} onValueChange={(value) => {
                setSelectedClassId(value);
                setSelectedSubjectId("");
              }}>
                <SelectTrigger className="rounded-lg border-[#E5E7EB] focus:border-[#2563EB]">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {assignedClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[#1F2937] mb-2 block">Subject</Label>
              <Select 
                value={selectedSubjectId} 
                onValueChange={setSelectedSubjectId}
                disabled={!selectedClassId}
              >
                <SelectTrigger className="rounded-lg border-[#E5E7EB] focus:border-[#2563EB]">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {availableSubjects.length === 0 ? (
                    <div className="p-3 text-center text-gray-500">
                      <AlertCircle className="w-4 h-4 mx-auto mb-1" />
                      <p className="text-sm">No registered subjects for this class</p>
                      <p className="text-xs mt-1">Please contact admin to register subjects for {currentTerm} - {currentAcademicYear}</p>
                    </div>
                  ) : (
                    availableSubjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.subjectId.toString()}>
                        {subject.subjectName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedClassId && selectedSubjectId && (
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="border-[#2563EB] text-[#2563EB] hover:bg-[#2563EB]/10 rounded-xl"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Template
              </Button>
              
              <div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                  disabled={isLocked}
                  id="csv-upload-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#10B981] text-[#10B981] hover:bg-[#10B981]/10 rounded-xl"
                  disabled={isLocked}
                  onClick={() => document.getElementById('csv-upload-input')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </Button>
              </div>

              {isLocked && (
                <Badge className="bg-[#EF4444] text-white rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Locked - Already Submitted
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score Entry Table */}
      {selectedClassId && selectedSubjectId && classStudents.length > 0 && (
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardHeader className="p-6 border-b border-[#E5E7EB]">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#1F2937]">
                Student Scores ({classStudents.length} students)
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveDraft}
                  variant="outline"
                  className="border-[#F59E0B] text-[#F59E0B] hover:bg-[#F59E0B]/10 rounded-xl"
                  disabled={isLocked}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savingStatus === 'saving' ? 'Saving...' : savingStatus === 'saved' ? 'Saved!' : 'Save Draft'}
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl shadow-clinical disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLocked || submittingStatus === 'submitting'}
                >
                  {submittingStatus === 'submitting' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : submittingStatus === 'submitted' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Submitted!
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Scores
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#2563EB] text-white">
                    <th className="text-left p-4">#</th>
                    <th className="text-left p-4">Student Name</th>
                    <th className="text-left p-4">Adm. No</th>
                    <th className="text-center p-4">CA1 (20)</th>
                    <th className="text-center p-4">CA2 (20)</th>
                    <th className="text-center p-4">Exam (60)</th>
                    <th className="text-center p-4">Total (100)</th>
                    <th className="text-center p-4">Grade</th>
                    <th className="text-center p-4">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((student, index) => {
                    const data = scoresData[student.id] || { ca1: '', ca2: '', exam: '' };
                    const { total, grade, remark } = calculateScore(data.ca1, data.ca2, data.exam);
                    const hasScore = data.ca1 || data.ca2 || data.exam;

                    return (
                      <tr key={student.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                        <td className="p-4 text-[#6B7280]">{index + 1}</td>
                        <td className="p-4 text-[#1F2937]">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="p-4 text-[#6B7280]">{student.admissionNumber}</td>
                        <td className="p-2 text-center">
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            value={data.ca1}
                            onChange={(e) => handleScoreChange(student.id, 'ca1', e.target.value)}
                            className="w-20 mx-auto text-center rounded-lg border-[#E5E7EB] focus:border-[#2563EB]"
                            disabled={isLocked}
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Input
                            type="number"
                            min="0"
                            max="20"
                            value={data.ca2}
                            onChange={(e) => handleScoreChange(student.id, 'ca2', e.target.value)}
                            className="w-20 mx-auto text-center rounded-lg border-[#E5E7EB] focus:border-[#2563EB]"
                            disabled={isLocked}
                          />
                        </td>
                        <td className="p-2 text-center">
                          <Input
                            type="number"
                            min="0"
                            max="60"
                            value={data.exam}
                            onChange={(e) => handleScoreChange(student.id, 'exam', e.target.value)}
                            className="w-20 mx-auto text-center rounded-lg border-[#E5E7EB] focus:border-[#2563EB]"
                            disabled={isLocked}
                          />
                        </td>
                        <td className="p-4 text-center">
                          <span className={`${hasScore ? 'text-[#1F2937]' : 'text-[#9CA3AF]'}`}>
                            {hasScore ? total : '-'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {hasScore && (
                            <Badge className={`
                              ${grade === 'A' ? 'bg-[#10B981]' : ''}
                              ${grade === 'B' ? 'bg-[#3B82F6]' : ''}
                              ${grade === 'C' ? 'bg-[#F59E0B]' : ''}
                              ${grade === 'D' ? 'bg-[#F97316]' : ''}
                              ${grade === 'F' ? 'bg-[#EF4444]' : ''}
                              text-white rounded-full
                            `}>
                              {grade}
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 text-center text-[#6B7280] text-sm">
                          {hasScore ? remark : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedClassId && selectedSubjectId && classStudents.length === 0 && (
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-[#9CA3AF] mx-auto mb-4" />
            <p className="text-[#6B7280]">No students found in this class</p>
          </CardContent>
        </Card>
      )}

      {(!selectedClassId || !selectedSubjectId) && (
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-12 text-center">
            <FileSpreadsheet className="w-12 h-12 text-[#9CA3AF] mx-auto mb-4" />
            <p className="text-[#6B7280] mb-2">Please select a class and subject to begin</p>
            <p className="text-sm text-[#9CA3AF]">
              {selectedClassId && !selectedSubjectId 
                ? "Only registered subjects for this class and term will appear in the subject dropdown"
                : "Your assigned classes and registered subjects will appear in the dropdowns above"
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="rounded-xl bg-gradient-to-r from-[#3B82F6]/10 to-[#3B82F6]/5 border border-[#3B82F6]/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#3B82F6] mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm text-[#1F2937]">
              <p><strong>Score Entry Instructions:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-[#6B7280]">
                <li>CA1 & CA2: Maximum 20 marks each</li>
                <li>Exam: Maximum 60 marks</li>
                <li>Use "Export Template" to download CSV for offline entry</li>
                <li>Fill the CSV and use "Import CSV" to upload scores</li>
                <li>"Save Draft" allows you to continue later</li>
                <li>"Submit Scores" locks the scores and notifies the Class Teacher</li>
                <li>After submission, scores cannot be edited unless Admin unlocks them</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
