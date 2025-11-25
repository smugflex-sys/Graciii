import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Receipt, 
  CheckCircle, 
  Bell, 
  FileText, 
  TrendingUp, 
  DollarSign, 
  Eye,
  CreditCard,
  BarChart3,
  Building2,
  Lock,
  LogOut,
  Edit3,
  Briefcase,
  Shield,
  Settings
} from "lucide-react";
import { ErrorBoundary } from "./common/ErrorBoundary";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopBar } from "./DashboardTopBar";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { RecordPaymentPage } from "./accountant/RecordPaymentPage";
import { PaymentHistoryPage } from "./accountant/PaymentHistoryPage";
import { VerifyReceiptsPage } from "./accountant/VerifyReceiptsPage";
import { SetFeesPage } from "./accountant/SetFeesPage";
import { PaymentReportsPage } from "./accountant/PaymentReportsPage";
import { BankAccountSettingsPage } from "./accountant/BankAccountSettingsPage";
import { ManualPaymentEntryPage } from "./accountant/ManualPaymentEntryPage";
import { ChangePasswordPage } from "./ChangePasswordPage";
import { NotificationsPage } from "./NotificationsPage";
import { useSchool } from "../contexts/SchoolContext";
import { useAuth } from "../contexts/AuthContext";
import DataService from "../services/dataService";

export function AccountantDashboard() {
  const { logout, permissions } = useAuth();
  const { 
    payments, 
    currentUser, 
    accountants, 
    studentFeeBalances, 
    students,
    classes,
    currentTerm,
    currentAcademicYear,
    getUnreadNotifications
  } = useSchool();
  const [activeItem, setActiveItem] = useState("dashboard");
  const [backendStats, setBackendStats] = useState<{
    totalFeesExpected: number;
    totalPaymentsReceived: number;
    pendingPayments: { count: number; amount: number };
  } | null>(null);
  const [isLoadingBackendStats, setIsLoadingBackendStats] = useState(false);

  // Get current accountant
  const currentAccountant = currentUser ? accountants.find(a => a.id === currentUser.linkedId) : null;
  const accountantName = currentAccountant ? `${currentAccountant.firstName} ${currentAccountant.lastName}` : 'Accountant';
  
  // Get user's permissions and responsibilities from currentUser
  const userPermissions = currentUser?.permissions || [];

  useEffect(() => {
    const fetchBackendStats = async () => {
      try {
        setIsLoadingBackendStats(true);
        const data = await DataService.getAccountantDashboardData();
        setBackendStats(data);
      } catch (error) {
        console.error('Error fetching accountant dashboard data:', error);
      } finally {
        setIsLoadingBackendStats(false);
      }
    };

    fetchBackendStats();
  }, []);

  const sidebarItems = [
    { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard", id: "dashboard" },
    ...(permissions.canManagePayments ? [
      { icon: <CreditCard className="w-5 h-5" />, label: "Set Fees", id: "set-fees" },
      { icon: <Edit3 className="w-5 h-5" />, label: "Manual Payment Entry", id: "manual-payment" },
      { icon: <Receipt className="w-5 h-5" />, label: "Record Payments", id: "record-payments" },
    ] : []),
    ...(permissions.canVerifyPayments ? [
      { icon: <CheckCircle className="w-5 h-5" />, label: "Verify Receipts", id: "verify-receipts" },
    ] : []),
    ...(permissions.canViewReports ? [
      { icon: <BarChart3 className="w-5 h-5" />, label: "Payment Reports", id: "payment-reports" },
      { icon: <FileText className="w-5 h-5" />, label: "Payment History", id: "payment-history" },
    ] : []),
    ...(permissions.canManagePayments ? [
      { icon: <Building2 className="w-5 h-5" />, label: "Bank Settings", id: "bank-settings" },
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

  const pendingPayments = payments.filter(p => p.status === 'Pending');
  const unreadNotifications = currentUser ? getUnreadNotifications(currentUser.id, 'accountant') : [];

  // Calculate real statistics
  const currentTermBalances = studentFeeBalances.filter(
    b => b.term === currentTerm && b.academicYear === currentAcademicYear
  );

  const totalExpected = currentTermBalances.reduce((sum, b) => sum + b.totalFeeRequired, 0);
  const totalCollected = currentTermBalances.reduce((sum, b) => sum + b.totalPaid, 0);
  const totalOutstanding = currentTermBalances.reduce((sum, b) => sum + b.balance, 0);
  const collectionRate = totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : "0";

  // Today's payments
  const today = new Date().toDateString();
  const todayPayments = payments.filter(p => {
    const paymentDate = new Date(p.recordedDate).toDateString();
    return paymentDate === today && p.status === 'Verified';
  });

  const todayRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      <DashboardSidebar
        items={sidebarItems}
        activeItem={activeItem}
        onItemClick={handleItemClick}
        themeColor="#007C91"
      />

      <div className="lg:pl-64">
        <DashboardTopBar
          userName={accountantName}
          userRole="Accountant"
          notificationCount={unreadNotifications.length}
          onLogout={logout}
          onNotificationClick={() => setActiveItem("notifications")}
        />

        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          {activeItem === "dashboard" && (
            <div className="space-y-6">
              <div className="mb-6">
                <h1 className="text-[#1F2937] mb-2">Welcome back, {accountantName}</h1>
                <p className="text-[#6B7280]">Manage school finances, fee collection, and financial reporting</p>
                {/* Data Optimization Indicator */}
                <div className="flex items-center gap-2 mt-2 text-xs text-[#10B981]">
                  <CheckCircle className="w-3 h-3" />
                  <span>Optimized data loading - {students.length} active students loaded</span>
                </div>
              </div>

              {backendStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[#6B7280] text-sm">Total Fees Expected</p>
                        <TrendingUp className="w-5 h-5 text-[#007C91]" />
                      </div>
                      <p className="text-[#1F2937] mb-1 font-semibold">
                        ₦{backendStats.totalFeesExpected.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[#6B7280] text-sm">Payments Received</p>
                        <DollarSign className="w-5 h-5 text-[#10B981]" />
                      </div>
                      <p className="text-[#1F2937] mb-1 font-semibold">
                        ₦{backendStats.totalPaymentsReceived.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[#6B7280] text-sm">Pending Payments</p>
                        <Receipt className="w-5 h-5 text-[#F59E0B]" />
                      </div>
                      <p className="text-[#1F2937] mb-1 font-semibold">
                        {backendStats.pendingPayments.count} pending
                      </p>
                      <p className="text-xs text-[#6B7280]">
                        ₦{backendStats.pendingPayments.amount.toLocaleString()} total
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Financial Responsibilities Overview */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* My Financial Responsibilities */}
                <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
                  <CardHeader className="border-b border-[#E5E7EB] p-5">
                    <h3 className="text-[#1F2937] font-semibold flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-[#007C91]" />
                      My Financial Responsibilities
                    </h3>
                  </CardHeader>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-[#E0F2FE] rounded-lg border border-[#007C91]/20">
                      <CreditCard className="w-5 h-5 text-[#007C91]" />
                      <div>
                        <p className="text-[#1F2937] font-medium text-sm">Fee Collection</p>
                        <p className="text-[#6B7280] text-xs">Collect, record, and verify all school fees</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-[#F0FDF4] rounded-lg border border-[#10B981]/20">
                      <Receipt className="w-5 h-5 text-[#10B981]" />
                      <div>
                        <p className="text-[#1F2937] font-medium text-sm">Payment Management</p>
                        <p className="text-[#6B7280] text-xs">Process payments, issue receipts, track transactions</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-[#FEF3C7] rounded-lg border border-[#F59E0B]/20">
                      <BarChart3 className="w-5 h-5 text-[#F59E0B]" />
                      <div>
                        <p className="text-[#1F2937] font-medium text-sm">Financial Reporting</p>
                        <p className="text-[#6B7280] text-xs">Generate reports, analyze revenue, track collections</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 bg-[#DBEAFE] rounded-lg border border-[#3B82F6]/20">
                      <Building2 className="w-5 h-5 text-[#3B82F6]" />
                      <div>
                        <p className="text-[#1F2937] font-medium text-sm">Bank Operations</p>
                        <p className="text-[#6B7280] text-xs">Manage bank accounts, reconcile transactions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* System Access Permissions */}
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
                          if (perm.includes("Fee")) return <Settings className="w-5 h-5 text-[#10B981]" />;
                          if (perm.includes("Payment")) return <Edit3 className="w-5 h-5 text-[#007C91]" />;
                          if (perm.includes("Receipt")) return <CheckCircle className="w-5 h-5 text-[#F59E0B]" />;
                          if (perm.includes("Report")) return <FileText className="w-5 h-5 text-[#6B7280]" />;
                          if (perm.includes("Bank")) return <Building2 className="w-5 h-5 text-[#3B82F6]" />;
                          return <Shield className="w-5 h-5 text-[#007C91]" />;
                        };
                        
                        const getColor = (perm: string) => {
                          if (perm.includes("Fee")) return "bg-[#D1FAE5] border-[#10B981]/20";
                          if (perm.includes("Payment")) return "bg-[#E0F2FE] border-[#007C91]/20";
                          if (perm.includes("Receipt")) return "bg-[#FEF3C7] border-[#F59E0B]/20";
                          if (perm.includes("Report")) return "bg-[#F3F4F6] border-[#6B7280]/20";
                          if (perm.includes("Bank")) return "bg-[#DBEAFE] border-[#3B82F6]/20";
                          return "bg-[#E0F2FE] border-[#007C91]/20";
                        };
                        
                        return (
                          <div key={index} className={`flex items-center gap-3 p-3 rounded-lg border ${getColor(permission)}`}>
                            {getIcon(permission)}
                            <div>
                              <p className="text-[#1F2937] font-medium text-sm">{permission}</p>
                              <p className="text-[#6B7280] text-xs">
                                {permission.includes("Fee") && "Configure fees for different classes and payment types"}
                                {permission.includes("Payment") && "Record manual payments and offline transactions"}
                                {permission.includes("Receipt") && "Verify and validate payment receipts"}
                                {permission.includes("Report") && "Generate financial reports and analytics"}
                                {permission.includes("Bank") && "Manage bank account settings and configurations"}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    
                    {/* Always show basic accountant access */}
                    <div className="flex items-center gap-3 p-3 bg-[#E0F2FE] rounded-lg border border-[#007C91]/20">
                      <Shield className="w-5 h-5 text-[#007C91]" />
                      <div>
                        <p className="text-[#1F2937] font-medium text-sm">Basic Access</p>
                        <p className="text-[#6B7280] text-xs">View financial records and payment status</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-xl bg-gradient-to-br from-[#007C91] to-[#006073] text-white border-0 shadow-clinical hover:shadow-clinical-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <span className="text-sm opacity-80">{collectionRate}%</span>
                    </div>
                    <p className="text-white/80 text-sm mb-1">Total Collected</p>
                    <h3 className="text-white">₦{totalCollected.toLocaleString()}</h3>
                    <p className="text-xs text-white/60 mt-2">{currentTerm}</p>
                  </CardContent>
                </Card>

                <Card className="rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white border-0 shadow-clinical hover:shadow-clinical-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <span className="text-sm opacity-80">Today</span>
                    </div>
                    <p className="text-white/80 text-sm mb-1">Today's Revenue</p>
                    <h3 className="text-white">₦{todayRevenue.toLocaleString()}</h3>
                    <p className="text-xs text-white/60 mt-2">{todayPayments.length} payments</p>
                  </CardContent>
                </Card>

                <Card className="rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#F4B400] text-white border-0 shadow-clinical hover:shadow-clinical-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <Badge className="bg-white/20 text-white border-0">{pendingPayments.length}</Badge>
                    </div>
                    <p className="text-white/80 text-sm mb-1">Pending Verification</p>
                    <h3 className="text-white">{pendingPayments.length}</h3>
                    <p className="text-xs text-white/60 mt-2">Awaiting approval</p>
                  </CardContent>
                </Card>

                <Card className="rounded-xl bg-gradient-to-br from-[#EF4444] to-[#DC2626] text-white border-0 shadow-clinical hover:shadow-clinical-lg transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <DollarSign className="w-6 h-6" />
                      </div>
                    </div>
                    <p className="text-white/80 text-sm mb-1">Outstanding</p>
                    <h3 className="text-white">₦{totalOutstanding.toLocaleString()}</h3>
                    <p className="text-xs text-white/60 mt-2">Requires follow-up</p>
                  </CardContent>
                </Card>
              </div>

              {/* Collection Progress */}
              <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
                <CardHeader className="p-6 border-b border-[#E5E7EB]">
                  <CardTitle className="text-[#1F2937]">Fee Collection Progress - {currentTerm}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[#6B7280] text-sm">Collection Rate</span>
                      <span className="text-[#007C91]">{collectionRate}%</span>
                    </div>
                    <div className="w-full bg-[#E5E7EB] rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#007C91] to-[#10B981] h-full rounded-full transition-all duration-500"
                        style={{ width: `${collectionRate}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="p-4 bg-[#F9FAFB] rounded-lg">
                        <p className="text-xs text-[#6B7280] mb-1">Expected</p>
                        <p className="text-[#1F2937]">₦{totalExpected.toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-[#10B981]/10 rounded-lg">
                        <p className="text-xs text-[#6B7280] mb-1">Collected</p>
                        <p className="text-[#10B981]">₦{totalCollected.toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-[#EF4444]/10 rounded-lg">
                        <p className="text-xs text-[#6B7280] mb-1">Outstanding</p>
                        <p className="text-[#EF4444]">₦{totalOutstanding.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pending Payment Verifications */}
              <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
                <CardHeader className="p-6 border-b border-[#E5E7EB]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[#1F2937]">Pending Payment Verifications</CardTitle>
                    <Badge className="bg-[#F59E0B] text-white border-0 rounded-full">{pendingPayments.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-[#007C91] border-none hover:bg-[#007C91]">
                          <TableHead className="text-white">Student Name</TableHead>
                          <TableHead className="text-white">Term</TableHead>
                          <TableHead className="text-white">Amount</TableHead>
                          <TableHead className="text-white">Date</TableHead>
                          <TableHead className="text-white">Payment Method</TableHead>
                          <TableHead className="text-white text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingPayments.length === 0 ? (
                          <TableRow className="bg-white">
                            <TableCell colSpan={6} className="text-center py-8 text-[#6B7280]">
                              No pending payments to verify
                            </TableCell>
                          </TableRow>
                        ) : (
                          pendingPayments.slice(0, 5).map((payment) => (
                            <TableRow key={payment.id} className="bg-white border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                              <TableCell className="text-[#1F2937]">{payment.studentName}</TableCell>
                              <TableCell className="text-[#6B7280]">{payment.term}</TableCell>
                              <TableCell className="text-[#007C91]">₦{payment.amount.toLocaleString()}</TableCell>
                              <TableCell className="text-[#6B7280]">{new Date(payment.recordedDate).toLocaleDateString()}</TableCell>
                              <TableCell className="text-[#6B7280]">{payment.paymentMethod}</TableCell>
                              <TableCell className="text-center">
                                <Button 
                                  onClick={() => setActiveItem('verify-receipts')}
                                  className="bg-[#007C91] hover:bg-[#006073] text-white rounded-xl text-xs h-9 shadow-clinical hover:shadow-clinical-lg transition-all"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Verify
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {pendingPayments.length > 5 && (
                    <div className="p-4 border-t border-[#E5E7EB] text-center">
                      <Button
                        onClick={() => setActiveItem('verify-receipts')}
                        variant="outline"
                        className="text-[#007C91] border-[#007C91] hover:bg-[#007C91]/10 rounded-xl"
                      >
                        View All {pendingPayments.length} Pending Payments
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Verified Payments */}
              <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
                <CardHeader className="p-6 border-b border-[#E5E7EB]">
                  <CardTitle className="text-[#1F2937]">Recent Verified Payments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 p-6">
                  {payments
                    .filter(p => p.status === 'Verified')
                    .slice(0, 5)
                    .map((payment) => {
                      const student = students.find(s => s.id === payment.studentId);
                      const studentClass = student ? classes.find(c => c.id === student.classId) : null;
                      
                      return (
                        <div key={payment.id} className="flex items-center justify-between p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] hover:border-[#007C91] hover:shadow-clinical transition-all">
                          <div>
                            <p className="text-[#1F2937]">{payment.studentName}</p>
                            <p className="text-xs text-[#6B7280]">{studentClass?.name || 'N/A'} • {payment.paymentType}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[#007C91]">₦{payment.amount.toLocaleString()}</p>
                            <p className="text-xs text-[#6B7280]">{new Date(payment.recordedDate).toLocaleDateString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  {payments.filter(p => p.status === 'Verified').length === 0 && (
                    <div className="text-center py-8 text-[#6B7280]">
                      No verified payments yet
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card 
                  className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all cursor-pointer group"
                  onClick={() => setActiveItem('set-fees')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#007C91]/10 flex items-center justify-center group-hover:bg-[#007C91]/20 transition-all">
                      <CreditCard className="w-8 h-8 text-[#007C91]" />
                    </div>
                    <h3 className="text-[#1F2937] mb-2">Set Fee Structure</h3>
                    <p className="text-sm text-[#6B7280]">Configure fees for classes</p>
                  </CardContent>
                </Card>

                <Card 
                  className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all cursor-pointer group"
                  onClick={() => setActiveItem('record-payments')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#10B981]/10 flex items-center justify-center group-hover:bg-[#10B981]/20 transition-all">
                      <Receipt className="w-8 h-8 text-[#10B981]" />
                    </div>
                    <h3 className="text-[#1F2937] mb-2">Record Payment</h3>
                    <p className="text-sm text-[#6B7280]">Manual payment entry</p>
                  </CardContent>
                </Card>

                <Card 
                  className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all cursor-pointer group"
                  onClick={() => setActiveItem('payment-reports')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F4B400]/10 flex items-center justify-center group-hover:bg-[#F4B400]/20 transition-all">
                      <BarChart3 className="w-8 h-8 text-[#F4B400]" />
                    </div>
                    <h3 className="text-[#1F2937] mb-2">Generate Reports</h3>
                    <p className="text-sm text-[#6B7280]">Export payment reports</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <ErrorBoundary>
            {activeItem === "set-fees" && <SetFeesPage />}
            {activeItem === "manual-payment" && <ManualPaymentEntryPage />}
            {activeItem === "record-payments" && <RecordPaymentPage />}
            {activeItem === "verify-receipts" && <VerifyReceiptsPage />}
            {activeItem === "payment-reports" && <PaymentReportsPage />}
            {activeItem === "payment-history" && <PaymentHistoryPage />}
            {activeItem === "bank-settings" && <BankAccountSettingsPage />}
            {activeItem === "notifications" && <NotificationsPage />}
            {activeItem === "change-password" && <ChangePasswordPage />}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
