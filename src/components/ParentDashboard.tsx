import { useState } from "react";
import { LayoutDashboard, Users, FileText, CreditCard, Receipt, Bell, Download, Upload, User, GraduationCap, Shield, Eye, MessageSquare, Calendar, CheckCircle } from "lucide-react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopBar } from "./DashboardTopBar";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { toast } from "sonner";
import { PerformanceReportsPage } from "./parent/PerformanceReportsPage";
import { ViewResultsPage } from "./parent/ViewResultsPage";
import { PayFeePage } from "./parent/PayFeePage";
import { ChangePasswordPage } from "./ChangePasswordPage";
import { NotificationsPage } from "./NotificationsPage";
// import { StudentResultSheet } from "./StudentResultSheet";
import { useSchool } from "../contexts/SchoolContext";
import { useAuth } from "../contexts/AuthContext";

interface Child {
  id: number;
  name: string;
  class: string;
  balance: number;
  photo: string;
  totalFee: number;
}

export function ParentDashboard() {
  const { logout, permissions } = useAuth();
  const { currentUser, parents, students, getUnreadNotifications, getAllNotifications, studentFeeBalances, currentTerm, currentAcademicYear } = useSchool();
  const [activeItem, setActiveItem] = useState("dashboard");

  // Get current parent
  const currentParent = currentUser ? parents.find((p) => p.id === currentUser.linkedId) : null;
  const parentName = currentParent ? `${currentParent.firstName} ${currentParent.lastName}` : 'Parent';
  
  // Get user's assignments and responsibilities from currentUser
  const userAssignments = currentUser?.assignments || {};
  const userPermissions = currentUser?.permissions || [];
  
  // Get unread notifications count
  const unreadCount = currentUser ? getUnreadNotifications(currentUser.id, currentUser.role).length : 0;

  const allNotifications = currentUser ? getAllNotifications(currentUser.id, currentUser.role) : [];
  const recentNotifications = allNotifications.slice(0, 3);

  // Get parent's children from SchoolContext or user assignments
  const parentStudents = currentParent
    ? students.filter((s) => currentParent.studentIds.includes(s.id))
    : userAssignments.students 
    ? students.filter(s => userAssignments.students?.includes(s.id))
    : [];

  const children: Child[] = parentStudents.map(s => {
    const feeBalance = studentFeeBalances.find(
      (b) =>
        b.studentId === s.id &&
        b.term === currentTerm &&
        b.academicYear === currentAcademicYear
    );

    const totalFeeRequired = feeBalance?.totalFeeRequired ?? 0;
    const balance = feeBalance?.balance ?? 0;

    return {
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      class: s.className,
      balance,
      photo: "",
      totalFee: totalFeeRequired,
    };
  });

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", id: "dashboard" },
    { icon: <Users className="w-5 h-5" />, label: "My Children", id: "my-children" },
    ...(permissions.canViewReports ? [
      { icon: <FileText className="w-5 h-5" />, label: "View Results", id: "view-results" },
    ] : []),
    { icon: <CreditCard className="w-5 h-5" />, label: "Pay Fees", id: "pay-fees" },
    { icon: <Bell className="w-5 h-5" />, label: "Notifications", id: "notifications" },
  ].filter(Boolean);

  const handleItemClick = (id: string) => {
    if (id === "logout") {
      logout();
    } else {
      setActiveItem(id);
    }
  };

  const PaymentDialog = ({ child }: { child: Child }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-[#3B82F6] text-white hover:bg-[#2563EB] rounded-lg shadow-clinical hover:shadow-clinical-lg transition-all">
          Pay Now
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-lg bg-white border border-[#E5E7EB] text-[#1F2937]">
        <DialogHeader>
          <DialogTitle className="text-[#1F2937]">Pay Fees - {child.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
            <p className="text-[#6B7280]">Outstanding Balance</p>
            <p className="text-[#1F2937] font-semibold">₦{child.balance.toLocaleString()}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-[#1F2937]">Amount to Pay (₦)</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#1F2937]">Upload Payment Proof</Label>
            <div className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-8 text-center cursor-pointer hover:border-[#3B82F6] transition-colors bg-[#F9FAFB]">
              <Upload className="w-8 h-8 mx-auto mb-2 text-[#6B7280]" />
              <p className="text-[#6B7280]">Click to upload receipt/proof</p>
              <p className="text-xs text-[#6B7280] mt-1">PNG, JPG up to 5MB</p>
            </div>
          </div>

          <Button
            className="w-full h-12 bg-[#10B981] text-white hover:bg-[#059669] rounded-lg shadow-clinical"
            onClick={() => toast.success("Payment submitted for verification!")}
          >
            Submit Payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      <DashboardSidebar
        items={sidebarItems}
        activeItem={activeItem}
        onItemClick={handleItemClick}
      />

      <div className="lg:pl-64">
        <DashboardTopBar
          userName={parentName}
          userRole="Parent"
          notificationCount={unreadCount}
          onLogout={logout}
          onNotificationClick={() => setActiveItem("notifications")}
        />

        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {activeItem === "dashboard" && (
            <div className="space-y-6">
              <div className="mb-6">
                <h1 className="text-[#1F2937] mb-2">Welcome back, {parentName}</h1>
                <p className="text-[#6B7280]">Monitor your children's academic progress and manage school activities</p>
                {/* Data Optimization Indicator */}
                <div className="flex items-center gap-2 mt-2 text-xs text-[#10B981]">
                  <CheckCircle className="w-3 h-3" />
                  <span>Optimized data loading - {parentStudents.length} children loaded</span>
                </div>
              </div>

              {/* Parental Access Overview */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* My Permissions */}
                <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                  <CardHeader className="border-b border-[#E5E7EB] p-5">
                    <h3 className="text-[#1F2937] font-semibold flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[#10B981]" />
                      My Access & Permissions
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
                          if (perm.includes("Academic")) return <Eye className="w-5 h-5 text-[#10B981]" />;
                          if (perm.includes("Fee")) return <CreditCard className="w-5 h-5 text-[#3B82F6]" />;
                          if (perm.includes("Communication")) return <MessageSquare className="w-5 h-5 text-[#F59E0B]" />;
                          if (perm.includes("Calendar")) return <Calendar className="w-5 h-5 text-[#6B7280]" />;
                          return <Shield className="w-5 h-5 text-[#007C91]" />;
                        };
                        
                        const getColor = (perm: string) => {
                          if (perm.includes("Academic")) return "bg-[#D1FAE5] border-[#10B981]/20";
                          if (perm.includes("Fee")) return "bg-[#DBEAFE] border-[#3B82F6]/20";
                          if (perm.includes("Communication")) return "bg-[#FEF3C7] border-[#F59E0B]/20";
                          if (perm.includes("Calendar")) return "bg-[#F3F4F6] border-[#6B7280]/20";
                          return "bg-[#E0F2FE] border-[#007C91]/20";
                        };
                        
                        return (
                          <div key={index} className={`flex items-center gap-3 p-3 rounded-lg border ${getColor(permission)}`}>
                            {getIcon(permission)}
                            <div>
                              <p className="text-[#1F2937] font-medium text-sm">{permission}</p>
                              <p className="text-[#6B7280] text-xs">
                                {permission.includes("Academic") && "View results, attendance, and progress reports"}
                                {permission.includes("Fee") && "View fee status, make payments, download receipts"}
                                {permission.includes("Communication") && "Receive notifications, communicate with teachers"}
                                {permission.includes("Calendar") && "View school calendar, events, and schedules"}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    
                    {/* Always show basic parent access */}
                    <div className="flex items-center gap-3 p-3 bg-[#E0F2FE] rounded-lg border border-[#007C91]/20">
                      <Shield className="w-5 h-5 text-[#007C91]" />
                      <div>
                        <p className="text-[#1F2937] font-medium text-sm">Basic Access</p>
                        <p className="text-[#6B7280] text-xs">View your children's information and school updates</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Linked Students */}
                <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                  <CardHeader className="border-b border-[#E5E7EB] p-5">
                    <h3 className="text-[#1F2937] font-semibold flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#3B82F6]" />
                      Linked Students ({children.length})
                    </h3>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    {children.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
                        <p className="text-[#6B7280]">No students linked yet</p>
                        <p className="text-[#9CA3AF] text-sm mt-1">Contact administrator to link your children</p>
                      </div>
                    ) : (
                      children.map((child) => (
                        <div key={child.id} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] hover:border-[#3B82F6] transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center">
                              <User className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-[#1F2937] font-medium text-sm">{child.name}</p>
                              <p className="text-[#6B7280] text-xs">{child.class}</p>
                            </div>
                          </div>
                          <Badge className="bg-[#10B981] text-white border-0 text-xs">
                            Active
                          </Badge>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {children.map((child) => (
                  <Card key={child.id} className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all hover-lift">
                    <CardHeader className="p-5 border-b border-[#E5E7EB]">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-[#3B82F6] flex items-center justify-center">
                          <User className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h3 className="text-[#1F2937]">{child.name}</h3>
                          <p className="text-[#6B7280]">{child.class}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                          <p className="text-xs text-[#6B7280] mb-1">Total Fee</p>
                          <p className="text-[#1F2937] font-medium">₦{child.totalFee.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                          <p className="text-xs text-[#6B7280] mb-1">Balance</p>
                          <p className={child.balance > 0 ? "text-[#EF4444] font-medium" : "text-[#10B981] font-medium"}>
                            ₦{child.balance.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => setActiveItem("performance-reports")}
                          variant="outline"
                          className="flex-1 rounded-lg border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937]"
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          View Result
                        </Button>
                        {child.balance > 0 && <PaymentDialog child={child} />}
                      </div>

                      {child.balance === 0 && (
                        <div className="p-3 bg-[#DCFCE7] border border-[#10B981] rounded-lg text-center">
                          <Badge className="bg-[#10B981] text-white border-0">
                            Fully Paid
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                  <CardHeader className="p-5 border-b border-[#E5E7EB]">
                    <h3 className="text-[#1F2937]">Recent Notifications</h3>
                  </CardHeader>
                  <CardContent className="space-y-3 p-5 pt-5">
                    {recentNotifications.length === 0 ? (
                      <div className="text-center py-6 text-[#6B7280] text-sm">
                        No notifications yet.
                      </div>
                    ) : (
                      recentNotifications.map((notification) => (
                        <div key={notification.id} className="flex items-start gap-3 p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] hover:border-[#3B82F6] hover:shadow-clinical transition-all">
                          <div
                            className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              notification.type === 'warning'
                                ? 'bg-[#F59E0B]'
                                : notification.type === 'error'
                                ? 'bg-[#EF4444]'
                                : notification.type === 'success'
                                ? 'bg-[#10B981]'
                                : 'bg-[#3B82F6]'
                            }`}
                          />
                          <div className="flex-1">
                            <p className="text-[#1F2937] font-medium">{notification.title}</p>
                            <p className="text-xs text-[#6B7280]">
                              {new Date(notification.sentDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                  <CardHeader className="p-5 border-b border-[#E5E7EB]">
                    <h3 className="text-[#1F2937]">Quick Actions</h3>
                  </CardHeader>
                  <CardContent className="space-y-3 p-5 pt-5">
                    <Button
                      onClick={() => setActiveItem("performance-reports")}
                      className="w-full justify-start bg-[#F9FAFB] text-[#1F2937] hover:bg-[#3B82F6] hover:text-white rounded-lg h-12 border border-[#E5E7EB] transition-all"
                    >
                      <FileText className="w-5 h-5 mr-3" />
                      View Academic Reports
                    </Button>
                    <Button
                      onClick={() => setActiveItem("pay-fees")}
                      className="w-full justify-start bg-[#F9FAFB] text-[#1F2937] hover:bg-[#3B82F6] hover:text-white rounded-lg h-12 border border-[#E5E7EB] transition-all"
                    >
                      <CreditCard className="w-5 h-5 mr-3" />
                      Make Payment
                    </Button>
                    <Button
                      onClick={() => setActiveItem("payment-history")}
                      className="w-full justify-start bg-[#F9FAFB] text-[#1F2937] hover:bg-[#3B82F6] hover:text-white rounded-lg h-12 border border-[#E5E7EB] transition-all"
                    >
                      <Receipt className="w-5 h-5 mr-3" />
                      View Payment History
                    </Button>
                    <Button
                      onClick={() => setActiveItem("performance-reports")}
                      className="w-full justify-start bg-[#F9FAFB] text-[#1F2937] hover:bg-[#3B82F6] hover:text-white rounded-lg h-12 border border-[#E5E7EB] transition-all"
                    >
                      <Download className="w-5 h-5 mr-3" />
                      Download Report Card
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeItem === "my-children" && (
            <div className="space-y-6">
              <div className="mb-6">
                <h1 className="text-[#1F2937] mb-2">My Children</h1>
                <p className="text-[#6B7280]">View details and academic information for your children</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {children.map((child) => (
                  <Card key={child.id} className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-20 h-20 rounded-full bg-[#3B82F6] flex items-center justify-center">
                          <User className="w-10 h-10 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-[#1F2937] mb-1">{child.name}</h3>
                          <div className="flex items-center gap-2 text-[#6B7280]">
                            <GraduationCap className="w-4 h-4" />
                            <span>{child.class}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                          <span className="text-[#6B7280]">Total Fee:</span>
                          <span className="text-[#1F2937] font-medium">₦{child.totalFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                          <span className="text-[#6B7280]">Amount Paid:</span>
                          <span className="text-[#10B981] font-medium">₦{(child.totalFee - child.balance).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                          <span className="text-[#6B7280]">Balance:</span>
                          <span className={child.balance > 0 ? "text-[#EF4444] font-medium" : "text-[#10B981] font-medium"}>
                            ₦{child.balance.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 flex gap-2">
                        <Button
                          onClick={() => setActiveItem("performance-reports")}
                          className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-lg shadow-clinical hover:shadow-clinical-lg transition-all"
                        >
                          View Results
                        </Button>
                        {child.balance > 0 && <PaymentDialog child={child} />}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeItem === "view-results" && <ViewResultsPage />}
          {activeItem === "performance-reports" && <PerformanceReportsPage />}
          {activeItem === "pay-fees" && <PayFeePage />}
          {activeItem === "change-password" && <ChangePasswordPage />}
          {activeItem === "notifications" && <NotificationsPage />}
          
          {!["dashboard", "my-children", "view-results", "performance-reports", "pay-fees", "change-password", "notifications"].includes(activeItem) && (
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
