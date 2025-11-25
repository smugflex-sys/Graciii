import { useState, useEffect } from "react";
import { LayoutDashboard, Edit, FileText, Bell, BookOpen, Users, UserCheck, FileSpreadsheet, Lock, LogOut, Award, Calendar, Users2, GraduationCap, Loader2, CheckCircle } from "lucide-react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopBar } from "./DashboardTopBar";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AffectivePsychomotorPage } from "./teacher/AffectivePsychomotorPage";
import { ScoreEntryPage } from "./teacher/ScoreEntryPage";
import { CompileResultsPage } from "./teacher/CompileResultsPage";
import { ClassListPage } from "./teacher/ClassListPage";
import { ViewResultsPage } from "./teacher/ViewResultsPage";
import { ChangePasswordPage } from "./ChangePasswordPage";
import { NotificationsPage } from "./NotificationsPage";
import { useSchool } from "../contexts/SchoolContext";
import { useAuth } from "../contexts/AuthContext";

export function TeacherDashboard() {
  const { logout, permissions } = useAuth();
  const { currentUser, teachers, getTeacherAssignments, students, getUnreadNotifications, classes } = useSchool();
  const [activeItem, setActiveItem] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Simulate data loading and handle errors
  useEffect(() => {
    const loadTeacherData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Validate teacher data exists
        if (!currentUser || currentUser.role !== 'teacher') {
          throw new Error('Invalid teacher account or session expired');
        }
        
        // Simulate loading delay for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (err: any) {
        console.error('Error loading teacher data:', err);
        setError(err?.message || 'Failed to load teacher dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadTeacherData();
  }, [currentUser]);

  // Get current teacher data
  const currentTeacher = currentUser ? teachers.find(t => t.id === currentUser.linkedId) : null;
  const isClassTeacher = currentTeacher?.isClassTeacher || false;
  const teacherName = currentTeacher ? `${currentTeacher.firstName} ${currentTeacher.lastName}` : 'Teacher';
  const teacherAssignments = currentTeacher ? getTeacherAssignments(currentTeacher.id) : [];
  
  // Get teacher's class teacher assignment
  const classTeacherAssignment = currentTeacher?.classTeacherId 
    ? classes.find(c => c.id === currentTeacher.classTeacherId)
    : null;
  
  // Get teacher's subject assignments grouped by class
  const subjectAssignmentsByClass = teacherAssignments.reduce((acc, assignment) => {
    if (!acc[assignment.classId]) {
      acc[assignment.classId] = {
        className: assignment.className,
        subjects: []
      };
    }
    acc[assignment.classId].subjects.push(assignment.subjectName);
    return acc;
  }, {} as Record<number, { className: string; subjects: string[] }>);
  
  // Get unread notifications count
  const unreadNotifications = currentUser ? getUnreadNotifications(currentUser.id, currentUser.role) : [];

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", id: "dashboard" },
    { icon: <Users className="w-5 h-5" />, label: "Class List", id: "class-list" },
    ...(permissions.canEnterScores ? [
      { icon: <Edit className="w-5 h-5" />, label: "Enter Scores", id: "enter-scores" },
    ] : []),
    ...(isClassTeacher ? [
      { icon: <FileSpreadsheet className="w-5 h-5" />, label: "Compile Results", id: "compile-results" },
      { icon: <UserCheck className="w-5 h-5" />, label: "Affective & Psychomotor", id: "affective-psychomotor" },
    ] : []),
    ...(permissions.canViewReports ? [
      { icon: <FileText className="w-5 h-5" />, label: "View Results", id: "view-results" },
    ] : []),
    { icon: <Bell className="w-5 h-5" />, label: "Notifications", id: "notifications" },
    { icon: <Lock className="w-5 h-5" />, label: "Change Password", id: "change-password" },
    { icon: <LogOut className="w-5 h-5" />, label: "Logout", id: "logout" },
  ].filter(Boolean);

  const handleItemClick = (id: string) => {
    if (id === "logout") {
      logout();
    } else {
      setActiveItem(id);
    }
  };



  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      <DashboardSidebar
        items={sidebarItems}
        activeItem={activeItem}
        onItemClick={handleItemClick}
      />

      <div className="lg:pl-64">
        <DashboardTopBar
          userName={teacherName}
          userRole={isClassTeacher ? "Class Teacher" : "Subject Teacher"}
          notificationCount={unreadNotifications.length}
          onLogout={logout}
          onNotificationClick={() => setActiveItem("notifications")}
        />

        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {activeItem === "dashboard" && (
            <div className="space-y-6">
              <div className="mb-6">
                <h1 className="text-[#1F2937] mb-2">Welcome back, {teacherName}</h1>
                <p className="text-[#6B7280]">
                  {isClassTeacher 
                    ? `You have Class Teacher privileges for ${classTeacherAssignment?.name || 'your assigned class'} with additional responsibilities.`
                    : 'You are assigned as a Subject Teacher. Enter scores for your assigned subjects across different classes.'
                  }
                </p>
                {/* Data Optimization Indicator */}
                <div className="flex items-center gap-2 mt-2 text-xs text-[#10B981]">
                  <CheckCircle className="w-3 h-3" />
                  <span>Optimized data loading - {students.length} relevant students loaded</span>
                </div>
              </div>

              {/* Responsibilities & Assignments Overview */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Current Responsibilities */}
                <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                  <CardHeader className="border-b border-[#E5E7EB] p-5">
                    <h3 className="text-[#1F2937] font-semibold flex items-center gap-2">
                      <Award className="w-5 h-5 text-[#F59E0B]" />
                      My Responsibilities
                    </h3>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    {/* Class Teacher Role */}
                    {isClassTeacher && classTeacherAssignment && (
                      <div className="flex items-center gap-3 p-3 bg-[#DBEAFE] rounded-lg border border-[#3B82F6]/20">
                        <Users className="w-5 h-5 text-[#3B82F6]" />
                        <div>
                          <p className="text-[#1F2937] font-medium text-sm">Class Teacher</p>
                          <p className="text-[#6B7280] text-xs">
                            {classTeacherAssignment.name} • Manage class activities, compile results, student assessments
                          </p>
                        </div>
                        <Badge className="bg-[#3B82F6] text-white border-0 text-xs">
                          Active
                        </Badge>
                      </div>
                    )}
                    
                    {/* Subject Teacher Assignments */}
                    {Object.values(subjectAssignmentsByClass).map((classAssignment, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-[#FEF3C7] rounded-lg border border-[#F59E0B]/20">
                        <BookOpen className="w-5 h-5 text-[#F59E0B]" />
                        <div>
                          <p className="text-[#1F2937] font-medium text-sm">Subject Teacher</p>
                          <p className="text-[#6B7280] text-xs">
                            {classAssignment.className} • {classAssignment.subjects.join(', ')}
                          </p>
                        </div>
                        <Badge className="bg-[#F59E0B] text-white border-0 text-xs">
                          {classAssignment.subjects.length} {classAssignment.subjects.length === 1 ? 'Subject' : 'Subjects'}
                        </Badge>
                      </div>
                    ))}
                    
                    {/* No assignments message */}
                    {!isClassTeacher && Object.keys(subjectAssignmentsByClass).length === 0 && (
                      <div className="text-center py-8">
                        <Award className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
                        <p className="text-[#6B7280]">No assignments yet</p>
                        <p className="text-[#9CA3AF] text-sm mt-1">Contact administrator to get assigned subjects and/or classes</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Current Assignments */}
                <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                  <CardHeader className="border-b border-[#E5E7EB] p-5">
                    <h3 className="text-[#1F2937] font-semibold flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#3B82F6]" />
                      Current Assignments
                    </h3>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    {teacherAssignments.length === 0 ? (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
                        <p className="text-[#6B7280]">No assignments yet</p>
                        <p className="text-[#9CA3AF] text-sm mt-1">Contact administrator to get assigned</p>
                      </div>
                    ) : (
                      teacherAssignments.slice(0, 3).map((assignment) => {
                        // Students are now filtered by role-based loading
                        const classStudents = students.filter(s => s.classId === assignment.classId && s.status === 'Active');
                        const totalStudentsInClass = classStudents.length;
                        const maleStudents = classStudents.filter(s => s.gender === 'Male').length;
                        const femaleStudents = classStudents.filter(s => s.gender === 'Female').length;
                        
                        return (
                          <div key={assignment.id} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] hover:border-[#3B82F6] transition-all">
                            <div className="flex-1">
                              <p className="text-[#1F2937] font-medium text-sm">{assignment.className}</p>
                              <p className="text-[#6B7280] text-xs">{assignment.subjectName}</p>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-[#6B7280] text-xs">{totalStudentsInClass} students</span>
                                <span className="text-[#3B82F6] text-xs">{maleStudents} male</span>
                                <span className="text-[#EC4899] text-xs">{femaleStudents} female</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-[#10B981] text-white border-0 text-xs">
                                Active
                              </Badge>
                              {totalStudentsInClass > 0 && (
                                <div className="w-2 h-2 bg-[#10B981] rounded-full" title="Students available"></div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                    {teacherAssignments.length > 3 && (
                      <p className="text-center text-[#6B7280] text-sm">
                        +{teacherAssignments.length - 3} more assignments
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all hover-lift group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#6B7280] text-sm">Role</p>
                      <UserCheck className="w-5 h-5 text-[#F59E0B] group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-[#1F2937] mb-1 font-medium">{isClassTeacher ? "Class Teacher" : "Subject Teacher"}</p>
                    <Badge className={isClassTeacher ? "bg-[#F59E0B] text-white border-0 text-xs" : "bg-[#3B82F6] text-white border-0 text-xs"}>
                      {isClassTeacher ? "Full Access" : "Score Entry"}
                    </Badge>
                  </CardContent>
                </Card>

                <Card 
                  className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all hover-lift group cursor-pointer"
                  onClick={() => setActiveItem('enter-scores')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#6B7280] text-sm">Classes Assigned</p>
                      <BookOpen className="w-5 h-5 text-[#3B82F6] group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-[#1F2937] mb-1 font-semibold">{teacherAssignments.length}</p>
                    <p className="text-xs text-[#6B7280]">Active classes</p>
                  </CardContent>
                </Card>

                <Card 
                  className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all hover-lift group cursor-pointer"
                  onClick={() => setActiveItem('class-list')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#6B7280] text-sm">Total Students</p>
                      <Users className="w-5 h-5 text-[#3B82F6] group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-[#1F2937] mb-1 font-semibold">{students.filter(s => s.status === 'Active').length}</p>
                    <p className="text-xs text-[#6B7280]">Across all classes</p>
                  </CardContent>
                </Card>

                <Card 
                  className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all hover-lift group cursor-pointer"
                  onClick={() => setActiveItem('notifications')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#6B7280] text-sm">Notifications</p>
                      <Bell className="w-5 h-5 text-[#F59E0B] group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-[#1F2937] mb-1 font-semibold">{unreadNotifications.length}</p>
                    <p className="text-xs text-[#F59E0B]">{unreadNotifications.length > 0 ? 'Unread messages' : 'All caught up'}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Role-based Workflow Info */}
              {isClassTeacher ? (
                <Card className="rounded-lg bg-gradient-to-r from-[#F59E0B]/10 to-[#F59E0B]/5 border border-[#F59E0B]/20">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <UserCheck className="w-6 h-6 text-[#F59E0B] mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-[#1F2937] font-medium mb-2">Class Teacher Workflow</p>
                        <ol className="text-sm text-[#6B7280] space-y-1 list-decimal list-inside">
                          <li>Enter scores for subjects you teach (CA1, CA2, Exam)</li>
                          <li>Review and verify all subject teacher submissions for your class</li>
                          <li>Enter Affective & Psychomotor assessments for each student</li>
                          <li>Add class teacher comments on student performance</li>
                          <li>Compile and submit results to Admin for approval</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="rounded-lg bg-gradient-to-r from-[#3B82F6]/10 to-[#3B82F6]/5 border border-[#3B82F6]/20">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <BookOpen className="w-6 h-6 text-[#3B82F6] mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-[#1F2937] font-medium mb-2">Subject Teacher Workflow</p>
                        <ol className="text-sm text-[#6B7280] space-y-1 list-decimal list-inside">
                          <li>Select your assigned class and subject</li>
                          <li>Enter CA1 (20 marks), CA2 (20 marks), and Exam (60 marks) for each student</li>
                          <li>Scores are auto-calculated with total, grade, and remark</li>
                          <li>Submit scores to the Class Teacher for final compilation</li>
                          <li>Class Teacher will compile all subjects and submit for approval</li>
                        </ol>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                <CardHeader className="p-5 border-b border-[#E5E7EB]">
                  <h3 className="text-[#1F2937]">Your Classes</h3>
                </CardHeader>
                <CardContent className="space-y-3 p-5 pt-5">
                  {teacherAssignments.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
                      <p className="text-[#6B7280]">No class assignments yet</p>
                    </div>
                  ) : (
                    teacherAssignments.map((assignment) => {
                      const classStudents = students.filter(s => s.classId === assignment.classId && s.status === 'Active');
                      return (
                        <div key={assignment.id} className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] hover:border-[#3B82F6] hover:shadow-clinical transition-all">
                          <div>
                            <p className="text-[#1F2937] font-medium">{assignment.className} - {assignment.subjectName}</p>
                            <p className="text-[#6B7280] text-sm">{classStudents.length} students</p>
                          </div>
                          <Button 
                            onClick={() => {
                              setActiveItem("enter-scores");
                            }}
                            className="bg-[#3B82F6] text-white hover:bg-[#2563EB] rounded-lg shadow-clinical hover:shadow-clinical-lg transition-all"
                          >
                            Enter Scores
                          </Button>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeItem === "class-list" && <ClassListPage />}
          {activeItem === "enter-scores" && <ScoreEntryPage />}
          {activeItem === "compile-results" && <CompileResultsPage />}
          {activeItem === "affective-psychomotor" && <AffectivePsychomotorPage />}
          {activeItem === "view-results" && <ViewResultsPage />}
          {activeItem === "notifications" && <NotificationsPage />}
          {activeItem === "change-password" && <ChangePasswordPage />}
          
          {!["dashboard", "class-list", "enter-scores", "compile-results", "affective-psychomotor", "view-results", "notifications", "change-password"].includes(activeItem) && (
            <div className="space-y-6">
              <div className="flex items-center justify-center min-h-[400px]">
                <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical max-w-md w-full">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#3B82F6] flex items-center justify-center mx-auto mb-4 text-white">
                      {sidebarItems.find(item => item.id === activeItem)?.icon}
                    </div>
                    <h3 className="text-[#1F2937] mb-3">
                      {sidebarItems.find(item => item.id === activeItem)?.label}
                    </h3>
                    <p className="text-[#6B7280]">
                      This section contains the functionality for {sidebarItems.find(item => item.id === activeItem)?.label.toLowerCase()}.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
