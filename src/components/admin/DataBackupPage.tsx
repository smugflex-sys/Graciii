import { useState } from "react";
import { Download, Database, FileText, Users, DollarSign, GraduationCap, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Alert, AlertDescription } from "../ui/alert";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";

export function DataBackupPage() {
  const {
    students,
    teachers,
    parents,
    accountants,
    classes,
    subjects,
    subjectAssignments,
    scores,
    affectiveDomains,
    psychomotorDomains,
    compiledResults,
    feeStructures,
    studentFeeBalances,
    payments,
    users,
    notifications,
    activityLogs,
    schoolSettings,
    currentTerm,
    currentAcademicYear,
  } = useSchool();

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  // Helper function to convert data to CSV
  const convertToCSV = (data: any[], headers: string[]) => {
    const rows = data.map(item => {
      return headers.map(header => {
        const value = item[header];
        // Handle arrays and objects
        if (Array.isArray(value)) return `"${value.join(', ')}"`;
        if (typeof value === 'object' && value !== null) return `"${JSON.stringify(value)}"`;
        // Escape quotes in strings
        if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
        return value || '';
      }).join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
  };

  // Helper function to download file
  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Helper function to download JSON
  const downloadJSON = (data: any, filename: string) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export Students
  const exportStudents = () => {
    const headers = ['id', 'firstName', 'lastName', 'admissionNumber', 'classId', 'className', 'level', 'parentId', 'dateOfBirth', 'gender', 'status', 'academicYear'];
    const csv = convertToCSV(students, headers);
    downloadFile(csv, `students_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${students.length} students`);
  };

  // Export Teachers
  const exportTeachers = () => {
    const headers = ['id', 'firstName', 'lastName', 'employeeId', 'email', 'phone', 'qualification', 'specialization', 'status', 'isClassTeacher', 'classTeacherId'];
    const csv = convertToCSV(teachers, headers);
    downloadFile(csv, `teachers_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${teachers.length} teachers`);
  };

  // Export Parents
  const exportParents = () => {
    const headers = ['id', 'firstName', 'lastName', 'email', 'phone', 'studentIds', 'status'];
    const csv = convertToCSV(parents, headers);
    downloadFile(csv, `parents_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${parents.length} parents`);
  };

  // Export Classes
  const exportClasses = () => {
    const headers = ['id', 'name', 'level', 'section', 'capacity', 'currentStudents', 'classTeacherId', 'classTeacher', 'academicYear', 'status'];
    const csv = convertToCSV(classes, headers);
    downloadFile(csv, `classes_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${classes.length} classes`);
  };

  // Export Subjects
  const exportSubjects = () => {
    const headers = ['id', 'name', 'code', 'department', 'isCore', 'status'];
    const csv = convertToCSV(subjects, headers);
    downloadFile(csv, `subjects_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${subjects.length} subjects`);
  };

  // Export Subject Assignments
  const exportSubjectAssignments = () => {
    const headers = ['id', 'subjectId', 'subjectName', 'classId', 'className', 'teacherId', 'teacherName', 'academicYear', 'term'];
    const csv = convertToCSV(subjectAssignments, headers);
    downloadFile(csv, `subject_assignments_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${subjectAssignments.length} subject assignments`);
  };

  // Export Scores
  const exportScores = () => {
    const headers = ['id', 'studentId', 'subjectAssignmentId', 'subjectName', 'ca1', 'ca2', 'exam', 'total', 'classAverage', 'grade', 'remark', 'subjectTeacher', 'enteredBy', 'enteredDate', 'status'];
    const csv = convertToCSV(scores, headers);
    downloadFile(csv, `scores_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${scores.length} score entries`);
  };

  // Export Compiled Results
  const exportCompiledResults = () => {
    const headers = ['id', 'studentId', 'classId', 'term', 'academicYear', 'totalScore', 'averageScore', 'classAverage', 'position', 'totalStudents', 'timesPresent', 'timesAbsent', 'totalAttendanceDays', 'classTeacherComment', 'principalComment', 'status'];
    const csv = convertToCSV(compiledResults, headers);
    downloadFile(csv, `compiled_results_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${compiledResults.length} compiled results`);
  };

  // Export Fee Structures
  const exportFeeStructures = () => {
    const headers = ['id', 'classId', 'className', 'level', 'term', 'academicYear', 'tuitionFee', 'developmentLevy', 'sportsFee', 'examFee', 'booksFee', 'uniformFee', 'transportFee', 'totalFee'];
    const csv = convertToCSV(feeStructures, headers);
    downloadFile(csv, `fee_structures_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${feeStructures.length} fee structures`);
  };

  // Export Student Fee Balances
  const exportStudentFeeBalances = () => {
    const headers = ['id', 'studentId', 'classId', 'term', 'academicYear', 'totalFeeRequired', 'totalPaid', 'balance', 'status'];
    const csv = convertToCSV(studentFeeBalances, headers);
    downloadFile(csv, `student_fee_balances_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${studentFeeBalances.length} fee balance records`);
  };

  // Export Payments
  const exportPayments = () => {
    const headers = ['id', 'studentId', 'studentName', 'amount', 'paymentType', 'term', 'academicYear', 'paymentMethod', 'reference', 'recordedBy', 'recordedDate', 'status', 'receiptNumber'];
    const csv = convertToCSV(payments, headers);
    downloadFile(csv, `payments_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${payments.length} payment records`);
  };

  // Export Activity Logs
  const exportActivityLogs = () => {
    const headers = ['id', 'actor', 'actorRole', 'action', 'target', 'timestamp', 'ip', 'status', 'details'];
    const csv = convertToCSV(activityLogs, headers);
    downloadFile(csv, `activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${activityLogs.length} activity logs`);
  };

  // Export Users (passwords excluded for security)
  const exportUsers = () => {
    const safeUsers = users.map(({ password, ...user }) => user);
    const headers = ['id', 'username', 'role', 'linkedId', 'email', 'status'];
    const csv = convertToCSV(safeUsers, headers);
    downloadFile(csv, `users_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${users.length} users (passwords excluded)`);
  };

  // Export Affective Domains
  const exportAffectiveDomains = () => {
    const headers = ['id', 'studentId', 'classId', 'term', 'academicYear', 'attentiveness', 'attentivenessRemark', 'honesty', 'honestyRemark', 'neatness', 'neatnessRemark', 'obedience', 'obedienceRemark', 'senseOfResponsibility', 'senseOfResponsibilityRemark'];
    const csv = convertToCSV(affectiveDomains, headers);
    downloadFile(csv, `affective_domains_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${affectiveDomains.length} affective domain records`);
  };

  // Export Psychomotor Domains
  const exportPsychomotorDomains = () => {
    const headers = ['id', 'studentId', 'classId', 'term', 'academicYear', 'attentionToDirection', 'attentionToDirectionRemark', 'considerateOfOthers', 'considerateOfOthersRemark', 'handwriting', 'handwritingRemark', 'sports', 'sportsRemark', 'verbalFluency', 'verbalFluencyRemark', 'worksWellIndependently', 'worksWellIndependentlyRemark'];
    const csv = convertToCSV(psychomotorDomains, headers);
    downloadFile(csv, `psychomotor_domains_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`Exported ${psychomotorDomains.length} psychomotor domain records`);
  };

  // Export Complete Backup (All Data as JSON)
  const exportCompleteBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(0);

    const completeData = {
      metadata: {
        schoolName: schoolSettings.schoolName,
        schoolMotto: schoolSettings.schoolMotto,
        principalName: schoolSettings.principalName,
        currentTerm,
        currentAcademicYear,
        backupDate: new Date().toISOString(),
        version: '1.0',
      },
      students,
      teachers,
      parents,
      accountants,
      classes,
      subjects,
      subjectAssignments,
      scores,
      affectiveDomains,
      psychomotorDomains,
      compiledResults,
      feeStructures,
      studentFeeBalances,
      payments,
      users: users.map(({ password, ...user }) => user), // Exclude passwords
      notifications,
      activityLogs,
    };

    // Simulate progress
    const progressInterval = setInterval(() => {
      setBackupProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 100);

    // Download after short delay
    setTimeout(() => {
      downloadJSON(completeData, `graceland_complete_backup_${new Date().toISOString().split('T')[0]}.json`);
      setBackupProgress(100);
      
      setTimeout(() => {
        setIsBackingUp(false);
        setBackupProgress(0);
        toast.success('Complete system backup downloaded successfully!');
      }, 500);
    }, 1500);
  };

  const dataCategories = [
    {
      title: 'Student Data',
      icon: <GraduationCap className="w-5 h-5" />,
      items: [
        { name: 'Students', count: students.length, export: exportStudents, color: 'bg-blue-50 text-blue-600' },
        { name: 'Student Fee Balances', count: studentFeeBalances.length, export: exportStudentFeeBalances, color: 'bg-blue-50 text-blue-600' },
      ]
    },
    {
      title: 'Staff Data',
      icon: <Users className="w-5 h-5" />,
      items: [
        { name: 'Teachers', count: teachers.length, export: exportTeachers, color: 'bg-green-50 text-green-600' },
        { name: 'Parents', count: parents.length, export: exportParents, color: 'bg-green-50 text-green-600' },
        { name: 'Accountants', count: accountants.length, export: () => {
          const headers = ['id', 'firstName', 'lastName', 'employeeId', 'email', 'phone', 'department', 'status'];
          const csv = convertToCSV(accountants, headers);
          downloadFile(csv, `accountants_${new Date().toISOString().split('T')[0]}.csv`);
          toast.success(`Exported ${accountants.length} accountants`);
        }, color: 'bg-green-50 text-green-600' },
        { name: 'User Accounts', count: users.length, export: exportUsers, color: 'bg-green-50 text-green-600' },
      ]
    },
    {
      title: 'Academic Data',
      icon: <FileText className="w-5 h-5" />,
      items: [
        { name: 'Classes', count: classes.length, export: exportClasses, color: 'bg-purple-50 text-purple-600' },
        { name: 'Subjects', count: subjects.length, export: exportSubjects, color: 'bg-purple-50 text-purple-600' },
        { name: 'Subject Assignments', count: subjectAssignments.length, export: exportSubjectAssignments, color: 'bg-purple-50 text-purple-600' },
        { name: 'Scores', count: scores.length, export: exportScores, color: 'bg-purple-50 text-purple-600' },
        { name: 'Compiled Results', count: compiledResults.length, export: exportCompiledResults, color: 'bg-purple-50 text-purple-600' },
        { name: 'Affective Domains', count: affectiveDomains.length, export: exportAffectiveDomains, color: 'bg-purple-50 text-purple-600' },
        { name: 'Psychomotor Domains', count: psychomotorDomains.length, export: exportPsychomotorDomains, color: 'bg-purple-50 text-purple-600' },
      ]
    },
    {
      title: 'Financial Data',
      icon: <DollarSign className="w-5 h-5" />,
      items: [
        { name: 'Fee Structures', count: feeStructures.length, export: exportFeeStructures, color: 'bg-yellow-50 text-yellow-600' },
        { name: 'Payments', count: payments.length, export: exportPayments, color: 'bg-yellow-50 text-yellow-600' },
      ]
    },
    {
      title: 'System Data',
      icon: <Database className="w-5 h-5" />,
      items: [
        { name: 'Activity Logs', count: activityLogs.length, export: exportActivityLogs, color: 'bg-gray-50 text-gray-600' },
        { name: 'Notifications', count: notifications.length, export: () => {
          const headers = ['id', 'title', 'message', 'type', 'targetAudience', 'sentBy', 'sentDate', 'isRead'];
          const csv = convertToCSV(notifications, headers);
          downloadFile(csv, `notifications_${new Date().toISOString().split('T')[0]}.csv`);
          toast.success(`Exported ${notifications.length} notifications`);
        }, color: 'bg-gray-50 text-gray-600' },
      ]
    }
  ];

  const totalRecords = students.length + teachers.length + parents.length + classes.length + 
                        subjects.length + scores.length + compiledResults.length + 
                        payments.length + feeStructures.length;

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Data Backup & Export</h1>
        <p className="text-[#6B7280]">Download all system data for backup and archival purposes</p>
      </div>

      {/* Complete Backup Card */}
      <Card className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-6 h-6 text-white" />
                <h3 className="text-white text-xl">Complete System Backup</h3>
              </div>
              <p className="text-white/90 mb-4">
                Download all data in a single JSON file for complete system backup
              </p>
              <div className="flex items-center gap-4 mb-4">
                <Badge className="bg-white/20 text-white border-0 text-sm">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  {totalRecords.toLocaleString()} Total Records
                </Badge>
                <Badge className="bg-white/20 text-white border-0 text-sm">
                  17 Data Tables
                </Badge>
              </div>

              {isBackingUp && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm">Preparing backup...</span>
                    <span className="text-white text-sm">{backupProgress}%</span>
                  </div>
                  <Progress value={backupProgress} className="h-2 bg-white/20" />
                </div>
              )}

              <Button
                onClick={exportCompleteBackup}
                disabled={isBackingUp}
                className="bg-white hover:bg-white/90 text-[#2563EB] rounded-xl shadow-md px-6"
              >
                <Download className="w-5 h-5 mr-2" />
                {isBackingUp ? 'Preparing Backup...' : 'Download Complete Backup (JSON)'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Information Alert */}
      <Alert className="bg-blue-50 border-blue-200 rounded-xl">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-[#1F2937]">
          <strong>Backup Best Practices:</strong> Download regular backups to prevent data loss. 
          Store backups in a secure location. Complete backup includes all system data in JSON format 
          for easy restoration. Individual CSV exports are provided for specific data tables.
        </AlertDescription>
      </Alert>

      {/* Individual Data Category Cards */}
      {dataCategories.map((category, index) => (
        <Card key={index} className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm">
          <CardHeader className="p-5 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#F3F4F6] rounded-lg">
                {category.icon}
              </div>
              <h3 className="text-[#1F2937]">{category.title}</h3>
            </div>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid md:grid-cols-2 gap-3">
              {category.items.map((item, idx) => (
                <div
                  key={idx}
                  className={`${item.color} p-4 rounded-xl flex items-center justify-between`}
                >
                  <div>
                    <p className="text-sm opacity-80 mb-1">{item.name}</p>
                    <p className="font-semibold text-lg">{item.count.toLocaleString()} records</p>
                  </div>
                  <Button
                    onClick={item.export}
                    size="sm"
                    variant="ghost"
                    className="hover:bg-white/50 rounded-lg"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    CSV
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Footer Information */}
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#6B7280] mt-0.5" />
            <div>
              <p className="text-[#1F2937] mb-2">
                <strong>About Data Export:</strong>
              </p>
              <ul className="text-[#6B7280] text-sm space-y-1">
                <li>• CSV files can be opened in Excel, Google Sheets, or any spreadsheet software</li>
                <li>• JSON backup contains all data and can be used for system restoration</li>
                <li>• User passwords are excluded from exports for security</li>
                <li>• Backup files are named with today's date for easy identification</li>
                <li>• Store backups securely and regularly (recommended: weekly backups)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
