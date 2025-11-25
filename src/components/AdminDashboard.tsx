import { useState, useEffect } from "react";
import { 
  LayoutDashboard, Users, UserPlus, GraduationCap,
  CheckCircle, Bell, Settings, FileText,
  Link as LinkIcon, BookOpen, List, Award, BarChart3, MessageSquare, Database, DollarSign, Activity, Shield, Loader2
} from "lucide-react";
// Updated: removed workflow demo
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopBar } from "./DashboardTopBar";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ErrorBoundary } from "./common/ErrorBoundary";
import { useAuth } from "../contexts/AuthContext";
import { RegisterUserPage } from "./admin/RegisterUserPage";
import { AddStudentPage } from "./admin/AddStudentPage";
import { ManageStudentsPage } from "./admin/ManageStudentsPage";
import { ManageTeachersPage } from "./admin/ManageTeachersPage";
import { ManageParentsPage } from "./admin/ManageParentsPage";
import { NotificationSystemPage } from "./admin/NotificationSystemPage";
import { ApproveResultsPage } from "./admin/ApproveResultsPage";
import { SystemSettingsPage } from "./admin/SystemSettingsPage";
import { LinkStudentParentPage } from "./admin/LinkStudentParentPage";
import { ManageClassesPage } from "./admin/ManageClassesPage";
import { ManageSubjectsPage } from "./admin/ManageSubjectsPage";
import { ClassSubjectRegistrationPage } from "./admin/ClassSubjectRegistrationPage";
import { CreateClassPage } from "./admin/CreateClassPage";
import { ManageTeacherAssignmentsPage } from "./admin/ManageTeacherAssignmentsPage";
import { PromotionSystemPage } from "./admin/PromotionSystemPage";
import { ViewAllResultsPage } from "./admin/ViewAllResultsPage";
import { NotificationsPage } from "./NotificationsPage";
import { DataBackupPage } from "./admin/DataBackupPage";
import { ActivityLogsPage } from "./admin/ActivityLogsPage";
import { FeeManagementPage } from "./admin/FeeManagementPage";
import { useSchool } from "../contexts/SchoolContext";
import DataService from "../services/dataService";
import { sessionsAPI, termsAPI } from "../services/apiService";

export function AdminDashboard() {
  const { logout, permissions } = useAuth();
  const { user } = useAuth();
  const { students, teachers, getPendingApprovals, currentUser, getUnreadNotifications } = useSchool();
  const [activeItem, setActiveItem] = useState("dashboard");
  const [activeSession, setActiveSession] = useState<any>(null);
  const [activeTerm, setActiveTerm] = useState<any>(null);
  const [isLoadingSessionTerm, setIsLoadingSessionTerm] = useState(true);
  const [dashboardStats, setDashboardStats] = useState<{
    totalUsers: number;
    totalClasses: number;
    totalSubjects: number;
    totalStudents: number;
    totalPayments: number;
  } | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Get user's permissions and responsibilities from currentUser
  const userPermissions = currentUser?.permissions || [];

  // Fetch active session and term from backend on mount
  useEffect(() => {
    const fetchSessionAndTerm = async () => {
      try {
        setIsLoadingSessionTerm(true);
        const [sessionData, termData] = await Promise.all([
          sessionsAPI.getActive(),
          termsAPI.getActive(),
        ]);
        
        setActiveSession(sessionData);
        setActiveTerm(termData);
      } catch (error) {
        console.error('Error fetching session/term:', error);
        // Fallback to defaults if fetch fails
        setActiveSession({ name: '2024/2025' });
        setActiveTerm({ name: 'Second Term', status: 'In Progress' });
      } finally {
        setIsLoadingSessionTerm(false);
      }
    };

    fetchSessionAndTerm();
  }, []);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setIsLoadingDashboard(true);
        const data = await DataService.getDashboardData();
        setDashboardStats(data);
      } catch (error: any) {
        console.error('Error fetching dashboard stats:', error);
        // Set error state for better user feedback
        setDashboardError(error?.message || 'Failed to load dashboard statistics');
      } finally {
        setIsLoadingDashboard(false);
      }
    };

    fetchDashboardStats();
  }, []);

  // Retry function for dashboard stats
  const retryDashboardStats = async () => {
    setDashboardError(null);
    try {
      setIsLoadingDashboard(true);
      const data = await DataService.getDashboardData();
      setDashboardStats(data);
      setDashboardError(null);
    } catch (error: any) {
      console.error('Error retrying dashboard stats:', error);
      setDashboardError(error?.message || 'Failed to load dashboard statistics');
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  // Get real statistics
  const activeStudents = students.filter(s => s.status === 'Active').length;
  const activeTeachers = teachers.filter(t => t.status === 'Active').length;
  const pendingResults = getPendingApprovals().length;
  const unreadNotifications = currentUser ? getUnreadNotifications(currentUser.id, currentUser.role) : [];

  const sidebarItems = [
    // Main Dashboard
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", id: "dashboard" },
    
    // User Management - Consolidated
    ...(permissions.canManageUsers ? [
      { icon: <UserPlus className="w-5 h-5" />, label: "Register User", id: "register-user" },
      { icon: <Users className="w-5 h-5" />, label: "Manage Teachers", id: "manage-teachers" },
      { icon: <Users className="w-5 h-5" />, label: "Manage Parents", id: "manage-parents" },
    ] : []),
    
    // Student Management
    ...(permissions.canManageStudents ? [
      { icon: <GraduationCap className="w-5 h-5" />, label: "Add Student", id: "add-student" },
      { icon: <Users className="w-5 h-5" />, label: "Manage Students", id: "manage-students" },
      { icon: <LinkIcon className="w-5 h-5" />, label: "Link Student-Parent", id: "link-student-parent" },
    ] : []),
    
    // Academic Management
    ...(permissions.canManageClasses ? [
      { icon: <BookOpen className="w-5 h-5" />, label: "Manage Classes", id: "manage-classes" },
    ] : []),
    ...(permissions.canManageSubjects ? [
      { icon: <List className="w-5 h-5" />, label: "Manage Subjects", id: "manage-subjects" },
      { icon: <BookOpen className="w-5 h-5" />, label: "Subject Registration", id: "subject-registration" },
    ] : []),
    ...(permissions.canManageAssignments ? [
      { icon: <Award className="w-5 h-5" />, label: "Teacher Assignments", id: "teacher-assignments" },
    ] : []),
    
    // Results Management
    ...(permissions.canApproveResults ? [
      { icon: <CheckCircle className="w-5 h-5" />, label: "Approve Results", id: "approve-results" },
    ] : []),
    ...(permissions.canViewReports ? [
      { icon: <BarChart3 className="w-5 h-5" />, label: "View All Results", id: "view-results" },
    ] : []),
    
    // Financial Management
    ...(permissions.canManagePayments ? [
      { icon: <DollarSign className="w-5 h-5" />, label: "Fee Management", id: "fee-management" },
    ] : []),
    
    // Communication & Settings
    { icon: <MessageSquare className="w-5 h-5" />, label: "Notifications", id: "send-notifications" },
    { icon: <Bell className="w-5 h-5" />, label: "View Notifications", id: "notifications" },
    ...(permissions.canManageSettings ? [
      { icon: <Activity className="w-5 h-5" />, label: "Activity Logs", id: "activity-logs" },
      { icon: <Database className="w-5 h-5" />, label: "Data Backup", id: "data-backup" },
      { icon: <Settings className="w-5 h-5" />, label: "Settings", id: "settings" },
    ] : []),
  ].filter(Boolean);

  const handleItemClick = (id: string) => {
    if (id === "logout") {
      logout();
    } else {
      setActiveItem(id);
    }
  };

  const adminName = user?.name || "Administrator";

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      <DashboardSidebar
        items={sidebarItems}
        activeItem={activeItem}
        onItemClick={handleItemClick}
      />

      <div className="lg:pl-64">
        <DashboardTopBar
          userName={adminName}
          userRole={user?.role || "admin"}
          notificationCount={unreadNotifications.length}
          onLogout={logout}
          onNotificationClick={() => setActiveItem("notifications")}
        />

        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {activeItem === "dashboard" && (
            <div className="space-y-6">
              <div className="mb-6">
                <h1 className="text-[#1F2937] mb-2">Admin Dashboard</h1>
                <p className="text-[#6B7280]">System Overview & Management</p>
              </div>

              {isLoadingDashboard ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i} className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                      <CardContent className="p-4">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded mb-3"></div>
                          <div className="h-6 bg-gray-200 rounded"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : dashboardError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-red-800 font-semibold">Error Loading Dashboard</h3>
                      <p className="text-red-600 text-sm">{dashboardError}</p>
                    </div>
                    <Button onClick={retryDashboardStats} size="sm" variant="outline">
                      Retry
                    </Button>
                  </div>
                </div>
              ) : dashboardStats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[#6B7280] text-sm">Total Users</p>
                        <Users className="w-5 h-5 text-[#3B82F6]" />
                      </div>
                      <p className="text-[#1F2937] mb-1 font-semibold">{dashboardStats.totalUsers}</p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[#6B7280] text-sm">Registered Students</p>
                        <GraduationCap className="w-5 h-5 text-[#10B981]" />
                      </div>
                      <p className="text-[#1F2937] mb-1 font-semibold">{dashboardStats.totalStudents}</p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[#6B7280] text-sm">Classes</p>
                        <BookOpen className="w-5 h-5 text-[#6366F1]" />
                      </div>
                      <p className="text-[#1F2937] mb-1 font-semibold">{dashboardStats.totalClasses}</p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[#6B7280] text-sm">Total Payments</p>
                        <DollarSign className="w-5 h-5 text-[#10B981]" />
                      </div>
                      <p className="text-[#1F2937] mb-1 font-semibold">₦{dashboardStats.totalPayments.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No dashboard data available</p>
                </div>
              )}

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card 
                  className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all hover-lift group cursor-pointer"
                  onClick={() => setActiveItem('manage-students')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#6B7280] text-sm">Total Students</p>
                      <Users className="w-5 h-5 text-[#3B82F6] group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-[#1F2937] mb-1 font-semibold">{activeStudents}</p>
                    <p className="text-xs text-[#10B981]">Active students</p>
                  </CardContent>
                </Card>

                <Card 
                  className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all hover-lift group cursor-pointer"
                  onClick={() => setActiveItem('manage-teachers')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#6B7280] text-sm">Teaching Staff</p>
                      <GraduationCap className="w-5 h-5 text-[#10B981] group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-[#1F2937] mb-1 font-semibold">{activeTeachers}</p>
                    <p className="text-xs text-[#10B981]">Active teachers</p>
                  </CardContent>
                </Card>

                <Card 
                  className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all hover-lift group cursor-pointer"
                  onClick={() => setActiveItem('approve-results')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#6B7280] text-sm">Pending Results</p>
                      <FileText className="w-5 h-5 text-[#F59E0B] group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-[#1F2937] mb-1 font-semibold">{pendingResults}</p>
                    <p className="text-xs text-[#F59E0B]">{pendingResults > 0 ? 'Awaiting approval' : 'All approved'}</p>
                  </CardContent>
                </Card>

                <Card 
                  className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all hover-lift group cursor-pointer"
                  onClick={() => setActiveItem('notifications')}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[#6B7280] text-sm">Notifications</p>
                      <Bell className="w-5 h-5 text-[#3B82F6] group-hover:scale-110 transition-transform" />
                    </div>
                    <p className="text-[#1F2937] mb-1 font-semibold">{unreadNotifications.length}</p>
                    <p className="text-xs text-[#6B7280]">Unread messages</p>
                  </CardContent>
                </Card>
              </div>

              {/* Active Session */}
              <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                <CardHeader className="bg-[#3B82F6] rounded-t-lg p-4 border-b border-[#E5E7EB]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-semibold">Active Session & Term</h3>
                    <Badge className="bg-[#10B981] text-white border-0 text-xs">
                      {isLoadingSessionTerm ? 'Loading...' : 'Active'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {isLoadingSessionTerm ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 text-[#3B82F6] animate-spin mr-2" />
                      <p className="text-[#6B7280]">Loading session and term...</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-3 gap-3">
                      <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                        <p className="text-[#6B7280] mb-1 text-sm">Academic Session</p>
                        <p className="text-[#1F2937] font-medium">{activeSession?.name || '2024/2025'}</p>
                      </div>
                      <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                        <p className="text-[#6B7280] mb-1 text-sm">Current Term</p>
                        <p className="text-[#1F2937] font-medium">{activeTerm?.name || 'Second Term'}</p>
                      </div>
                      <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                        <p className="text-[#6B7280] mb-1 text-sm">Status</p>
                        <p className="text-[#10B981] font-medium">{activeTerm?.status || 'In Progress'}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Administrative Permissions & Responsibilities */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* My Administrative Responsibilities */}
                <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                  <CardHeader className="border-b border-[#E5E7EB] p-5">
                    <h3 className="text-[#1F2937] font-semibold flex items-center gap-2">
                      <Settings className="w-5 h-5 text-[#3B82F6]" />
                      My Administrative Responsibilities
                    </h3>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-[#DBEAFE] rounded-lg border border-[#3B82F6]/20">
                      <UserPlus className="w-5 h-5 text-[#3B82F6]" />
                      <div>
                        <p className="text-[#1F2937] font-medium text-sm">User Management</p>
                        <p className="text-[#6B7280] text-xs">Register and manage all system users</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-[#D1FAE5] rounded-lg border border-[#10B981]/20">
                      <GraduationCap className="w-5 h-5 text-[#10B981]" />
                      <div>
                        <p className="text-[#1F2937] font-medium text-sm">Student Administration</p>
                        <p className="text-[#6B7280] text-xs">Manage student records and enrollment</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-[#FEF3C7] rounded-lg border border-[#F59E0B]/20">
                      <CheckCircle className="w-5 h-5 text-[#F59E0B]" />
                      <div>
                        <p className="text-[#1F2937] font-medium text-sm">Results Approval</p>
                        <p className="text-[#6B7280] text-xs">Review and approve academic results</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-[#F3F4F6] rounded-lg border border-[#6B7280]/20">
                      <BookOpen className="w-5 h-5 text-[#6B7280]" />
                      <div>
                        <p className="text-[#1F2937] font-medium text-sm">Academic Configuration</p>
                        <p className="text-[#6B7280] text-xs">Setup classes, subjects, and assignments</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* System Access & Permissions */}
                <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                  <CardHeader className="border-b border-[#E5E7EB] p-5">
                    <h3 className="text-[#1F2937] font-semibold flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[#10B981]" />
                      System Access & Permissions
                    </h3>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    {userPermissions.length === 0 ? (
                      <div className="text-center py-8">
                        <Shield className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
                        <p className="text-[#6B7280]">No specific permissions assigned</p>
                        <p className="text-[#9CA3AF] text-sm mt-1">Contact administrator to get permissions</p>
                      </div>
                    ) : (
                      userPermissions.map((permission, index) => {
                        const getIcon = (perm: string) => {
                          if (perm.includes("User")) return <UserPlus className="w-5 h-5 text-[#3B82F6]" />;
                          if (perm.includes("Student")) return <GraduationCap className="w-5 h-5 text-[#10B981]" />;
                          if (perm.includes("Result")) return <CheckCircle className="w-5 h-5 text-[#F59E0B]" />;
                          if (perm.includes("Academic")) return <BookOpen className="w-5 h-5 text-[#6B7280]" />;
                          if (perm.includes("System")) return <Settings className="w-5 h-5 text-[#8B5CF6]" />;
                          return <Shield className="w-5 h-5 text-[#007C91]" />;
                        };
                        
                        const getColor = (perm: string) => {
                          if (perm.includes("User")) return "bg-[#DBEAFE] border-[#3B82F6]/20";
                          if (perm.includes("Student")) return "bg-[#D1FAE5] border-[#10B981]/20";
                          if (perm.includes("Result")) return "bg-[#FEF3C7] border-[#F59E0B]/20";
                          if (perm.includes("Academic")) return "bg-[#F3F4F6] border-[#6B7280]/20";
                          if (perm.includes("System")) return "bg-[#EDE9FE] border-[#8B5CF6]/20";
                          return "bg-[#E0F2FE] border-[#007C91]/20";
                        };
                        
                        return (
                          <div key={index} className={`flex items-center gap-3 p-3 rounded-lg border ${getColor(permission)}`}>
                            {getIcon(permission)}
                            <div>
                              <p className="text-[#1F2937] font-medium text-sm">{permission}</p>
                              <p className="text-[#6B7280] text-xs">
                                {permission.includes("User") && "Manage user accounts and permissions"}
                                {permission.includes("Student") && "Handle student enrollment and records"}
                                {permission.includes("Result") && "Approve and manage academic results"}
                                {permission.includes("Academic") && "Configure classes and subjects"}
                                {permission.includes("System") && "Access system settings and configuration"}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    
                    {/* Always show basic admin access */}
                    <div className="flex items-center gap-3 p-3 bg-[#E0F2FE] rounded-lg border border-[#007C91]/20">
                      <Shield className="w-5 h-5 text-[#007C91]" />
                      <div>
                        <p className="text-[#1F2937] font-medium text-sm">Full System Access</p>
                        <p className="text-[#6B7280] text-xs">Complete administrative privileges</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions Info */}
              <Card className="rounded-lg bg-gradient-to-r from-[#3B82F6]/10 to-[#2563EB]/5 border border-[#3B82F6]/20">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-[#3B82F6] mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-[#1F2937] font-medium mb-2">Quick Actions Available</p>
                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="p-3 bg-white rounded-lg border border-[#E5E7EB]">
                          <p className="text-[#6B7280] text-sm">Use floating buttons (bottom right) for quick access to:</p>
                          <ul className="text-xs text-[#1F2937] mt-2 space-y-1">
                            <li>• Register New User</li>
                            <li>• Add Student</li>
                            <li>• Approve Results</li>
                          </ul>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-[#E5E7EB]">
                          <p className="text-[#6B7280] text-sm">Use sidebar menu to:</p>
                          <ul className="text-xs text-[#1F2937] mt-2 space-y-1">
                            <li>• Manage all users</li>
                            <li>• Configure classes & subjects</li>
                            <li>• Set teacher assignments</li>
                          </ul>
                        </div>
                        <div className="p-3 bg-white rounded-lg border border-[#E5E7EB]">
                          <p className="text-[#6B7280] text-sm">System features:</p>
                          <ul className="text-xs text-[#1F2937] mt-2 space-y-1">
                            <li>• Real-time notifications</li>
                            <li>• Student promotion</li>
                            <li>• Results approval workflow</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-30">
                <Button 
                  onClick={() => setActiveItem("register-user")}
                  className="w-12 h-12 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] shadow-lg hover:shadow-xl transition-all hover-lift"
                  title="Register User"
                >
                  <UserPlus className="w-5 h-5 text-white" />
                </Button>
                <Button 
                  onClick={() => setActiveItem("add-student")}
                  className="w-12 h-12 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] shadow-lg hover:shadow-xl transition-all hover-lift"
                  title="Add Student"
                >
                  <GraduationCap className="w-5 h-5 text-white" />
                </Button>
                <Button 
                  onClick={() => setActiveItem("approve-results")}
                  className="w-12 h-12 rounded-lg bg-[#10B981] hover:bg-[#059669] shadow-lg hover:shadow-xl transition-all hover-lift"
                  title="Approve Results"
                >
                  <CheckCircle className="w-5 h-5 text-white" />
                </Button>
              </div>
            </div>
          )}

          <ErrorBoundary>
            {activeItem === "register-user" && <RegisterUserPage />}
            {activeItem === "add-student" && <AddStudentPage />}
            {activeItem === "manage-students" && <ManageStudentsPage onNavigateToLink={() => setActiveItem("link-student-parent")} />}
            {activeItem === "manage-teachers" && <ManageTeachersPage />}
            {activeItem === "manage-parents" && <ManageParentsPage onNavigateToLink={() => setActiveItem("link-student-parent")} />}
            {activeItem === "manage-classes" && null}
            {activeItem === "create-class" && (
              <CreateClassPage 
                onBack={() => setActiveItem("manage-classes")}
                onSuccess={() => setActiveItem("manage-classes")}
              />
            )}
            {activeItem === "manage-students" && <ManageStudentsPage onNavigateToLink={() => setActiveItem("link-student-parent")} />}
            {activeItem === "manage-teachers" && <ManageTeachersPage />}
            {activeItem === "manage-parents" && <ManageParentsPage onNavigateToLink={() => setActiveItem("link-student-parent")} />}
            {activeItem === "manage-classes" && (
              <ManageClassesPage onNavigateToCreate={() => setActiveItem("create-class")} />
            )}
            {activeItem === "manage-subjects" && <ManageSubjectsPage />}
            {activeItem === "subject-registration" && <ClassSubjectRegistrationPage />}
            {activeItem === "teacher-assignments" && <ManageTeacherAssignmentsPage />}
            {activeItem === "promotion-system" && <PromotionSystemPage />}
            {activeItem === "approve-results" && <ApproveResultsPage />}
            {activeItem === "view-results" && <ViewAllResultsPage />}
            {activeItem === "link-student-parent" && <LinkStudentParentPage />}
            {activeItem === "fee-management" && <FeeManagementPage />}
            {activeItem === "send-notifications" && <NotificationSystemPage />}
            {activeItem === "notifications" && <NotificationsPage />}
            {activeItem === "activity-logs" && <ActivityLogsPage />}
          </ErrorBoundary>
          <ErrorBoundary>
            {activeItem === "data-backup" && <DataBackupPage />}
            {activeItem === "settings" && <SystemSettingsPage />}
          </ErrorBoundary>
          
          {!["dashboard", "register-user", "add-student", "manage-students", "manage-teachers", "manage-parents", "manage-classes", "manage-subjects", "subject-registration", "teacher-assignments", "promotion-system", "approve-results", "view-results", "link-student-parent", "fee-management", "send-notifications", "notifications", "activity-logs", "data-backup", "settings"].includes(activeItem) && (
            <div className="space-y-6">
              <div className="flex items-center justify-center min-h-[400px]">
                <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical max-w-md w-full">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 rounded-lg bg-[#3B82F6] flex items-center justify-center mx-auto mb-4">
                      {sidebarItems.find(item => item.id === activeItem)?.icon}
                    </div>
                    <h3 className="text-[#1F2937] mb-3 font-semibold">
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
