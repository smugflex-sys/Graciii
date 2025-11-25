import { useState, useEffect } from "react";
import { Save, Upload, UserPlus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";
import { settingsAPI } from "../../services/apiService";
import DataService from "../../services/dataService";

export function SystemSettingsPage() {
  const { 
    currentTerm, 
    currentAcademicYear, 
    updateCurrentTerm, 
    updateCurrentAcademicYear,
    schoolSettings,
    updateSchoolSettings,
    addUser,
    users,
    changePassword
  } = useSchool();

  const [sessionData, setSessionData] = useState({
    currentSession: currentAcademicYear,
    currentTerm: currentTerm,
  });

  const [brandingData, setBrandingData] = useState({
    schoolName: schoolSettings.schoolName,
    schoolMotto: schoolSettings.schoolMotto,
    principalName: schoolSettings.principalName,
  });
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  // Update local state when context changes
  useEffect(() => {
    setSessionData({
      currentSession: currentAcademicYear,
      currentTerm: currentTerm,
    });
  }, [currentAcademicYear, currentTerm]);

  // Update branding when school settings change
  useEffect(() => {
    setBrandingData({
      schoolName: schoolSettings.schoolName,
      schoolMotto: schoolSettings.schoolMotto,
      principalName: schoolSettings.principalName,
    });
  }, [schoolSettings]);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const branding = await settingsAPI.getSchoolBranding();
        setBrandingData({
          schoolName: branding.schoolName || '',
          schoolMotto: branding.schoolMotto || '',
          principalName: branding.principalName || '',
        });
      } catch (error) {
        console.error('Error fetching branding from backend:', error);
      }
    };

    fetchBranding();
  }, []);

  const [adminData, setAdminData] = useState({
    username: "",
    email: "",
    password: "",
  });

  const [passwordResetData, setPasswordResetData] = useState({
    username: "",
    newPassword: "",
  });

  const handleUpdateSession = () => {
    updateCurrentAcademicYear(sessionData.currentSession);
    updateCurrentTerm(sessionData.currentTerm);
    toast.success(`Academic session and term updated to ${sessionData.currentSession} - ${sessionData.currentTerm}`);
  };

  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    try {
      await settingsAPI.updateSchoolBranding({
        schoolName: brandingData.schoolName,
        schoolMotto: brandingData.schoolMotto,
        principalName: brandingData.principalName,
      });

      // Optimistically update context
      updateSchoolSettings({
        schoolName: brandingData.schoolName,
        schoolMotto: brandingData.schoolMotto,
        principalName: brandingData.principalName,
      });

      toast.success("School branding updated successfully!");
    } catch (error) {
      console.error('Failed to update branding:', error);
      toast.error("Failed to save branding. Please try again.");
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();

    // Check if username already exists
    const existingUser = users.find(u => u.username === adminData.username);
    if (existingUser) {
      toast.error("Username already exists. Please choose a different username.");
      return;
    }

    // Create new admin user
    addUser({
      username: adminData.username,
      password: adminData.password,
      role: 'admin',
      linkedId: 0, // Admin has no linked profile
      email: adminData.email,
      status: 'Active',
    });

    toast.success("New admin account created successfully!");
    setAdminData({ username: "", email: "", password: "" });
  };

  const handleResetPassword = () => {
    if (!passwordResetData.username || !passwordResetData.newPassword) {
      toast.error("Please enter both username and new password");
      return;
    }

    const user = users.find(u => u.username === passwordResetData.username);
    if (!user) {
      toast.error("User not found");
      return;
    }

    // In production, verify current password before reset
    // This is a simplified implementation for demonstration
    const success = changePassword(user.id, '', passwordResetData.newPassword);
    
    if (success) {
      toast.success(`Password reset successful for ${passwordResetData.username}!`);
      setPasswordResetData({ username: "", newPassword: "" });
    } else {
      toast.error("Password reset failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-white mb-2">System Settings</h1>
        <p className="text-[#C0C8D3]">Configure school system settings and administration</p>
      </div>

      {/* School Logo & Branding */}
      <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg max-w-4xl">
        <CardHeader className="p-5 border-b border-white/10">
          <h3 className="text-white">School Branding</h3>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-[#1E90FF] to-[#00BFFF] flex items-center justify-center border-4 border-white/10">
                <span className="text-white text-center px-4">School Logo</span>
              </div>
              <div className="flex-1">
                <p className="text-white mb-3">Upload School Logo</p>
                <Button className="bg-[#1E90FF] hover:bg-[#00BFFF] text-white rounded-xl shadow-md hover:scale-105 transition-all">
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
                <p className="text-xs text-[#C0C8D3] mt-2">Recommended: 512x512px, PNG or JPG</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-white">School Name</Label>
              <Input
                value={brandingData.schoolName}
                onChange={(e) => setBrandingData({ ...brandingData, schoolName: e.target.value })}
                className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">School Motto</Label>
              <Input
                value={brandingData.schoolMotto}
                onChange={(e) => setBrandingData({ ...brandingData, schoolMotto: e.target.value })}
                className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">Principal Name</Label>
              <Input
                value={brandingData.principalName}
                onChange={(e) => setBrandingData({ ...brandingData, principalName: e.target.value })}
                className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white"
              />
            </div>

            <Button onClick={handleSaveBranding} disabled={isSavingBranding} className="bg-[#28A745] hover:bg-[#28A745]/90 text-white rounded-xl shadow-md hover:scale-105 transition-all">
              <Save className="w-4 h-4 mr-2" />
              {isSavingBranding ? 'Saving...' : 'Save Branding'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Academic Session & Term */}
      <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg max-w-4xl">
        <CardHeader className="p-5 border-b border-white/10">
          <h3 className="text-white">Academic Session & Term</h3>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Current Academic Session</Label>
                <Select value={sessionData.currentSession} onValueChange={(value) => setSessionData({ ...sessionData, currentSession: value })}>
                  <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0F243E] border-white/10">
                    <SelectItem value="2023/2024" className="text-white hover:bg-[#1E90FF]">2023/2024</SelectItem>
                    <SelectItem value="2024/2025" className="text-white hover:bg-[#1E90FF]">2024/2025</SelectItem>
                    <SelectItem value="2025/2026" className="text-white hover:bg-[#1E90FF]">2025/2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Current Term</Label>
                <Select value={sessionData.currentTerm} onValueChange={(value) => setSessionData({ ...sessionData, currentTerm: value })}>
                  <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0F243E] border-white/10">
                    <SelectItem value="First Term" className="text-white hover:bg-[#1E90FF]">First Term</SelectItem>
                    <SelectItem value="Second Term" className="text-white hover:bg-[#1E90FF]">Second Term</SelectItem>
                    <SelectItem value="Third Term" className="text-white hover:bg-[#1E90FF]">Third Term</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-[#1E90FF]/10 border border-[#1E90FF] rounded-xl">
              <p className="text-[#C0C8D3]">
                <strong className="text-white">Note:</strong> Changing the session or term will affect all result entries and fee structures. Please ensure all current term results are finalized before updating.
              </p>
            </div>

            <Button onClick={handleUpdateSession} className="bg-[#1E90FF] hover:bg-[#00BFFF] text-white rounded-xl shadow-md hover:scale-105 transition-all">
              <RefreshCw className="w-4 h-4 mr-2" />
              Update Session & Term
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Admin Account */}
      <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg max-w-4xl">
        <CardHeader className="p-5 border-b border-white/10">
          <h3 className="text-white">Administrator Management</h3>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleCreateAdmin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">New Admin Username</Label>
                <Input
                  required
                  value={adminData.username}
                  onChange={(e) => setAdminData({ ...adminData, username: e.target.value })}
                  placeholder="Enter username"
                  className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Admin Email</Label>
                <Input
                  required
                  type="email"
                  value={adminData.email}
                  onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                  placeholder="admin@gracelandgombe.edu"
                  className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white">Initial Password</Label>
                <Input
                  required
                  type="password"
                  value={adminData.password}
                  onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                  placeholder="Enter secure password"
                  className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white"
                />
              </div>
            </div>

            <Button type="submit" className="bg-[#28A745] hover:bg-[#28A745]/90 text-white rounded-xl shadow-md hover:scale-105 transition-all">
              <UserPlus className="w-4 h-4 mr-2" />
              Create Admin Account
            </Button>
          </form>

          <Separator className="my-6 bg-white/10" />

          <div className="space-y-4">
            <h4 className="text-white">Password Management</h4>
            <p className="text-[#C0C8D3]">Reset password for existing users (Admin, Teacher, Accountant, Parent)</p>
            
            <div className="grid md:grid-cols-2 gap-3">
              <Input
                placeholder="Enter username"
                value={passwordResetData.username}
                onChange={(e) => setPasswordResetData({ ...passwordResetData, username: e.target.value })}
                className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white"
              />
              <Input
                type="password"
                placeholder="Enter new password"
                value={passwordResetData.newPassword}
                onChange={(e) => setPasswordResetData({ ...passwordResetData, newPassword: e.target.value })}
                className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white"
              />
            </div>
            <Button onClick={handleResetPassword} className="bg-[#FFC107] hover:bg-[#FFC107]/90 text-[#0A2540] rounded-xl shadow-md hover:scale-105 transition-all whitespace-nowrap px-6">
              Reset Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg max-w-4xl">
        <CardHeader className="p-5 border-b border-white/10">
          <h3 className="text-white">System Information</h3>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-[#0F243E] rounded-xl border border-white/5">
              <p className="text-[#C0C8D3] mb-1">System Version</p>
              <p className="text-white">v1.0.0</p>
            </div>
            <div className="p-4 bg-[#0F243E] rounded-xl border border-white/5">
              <p className="text-[#C0C8D3] mb-1">Last Backup</p>
              <p className="text-white">2024-01-15 10:30 AM</p>
            </div>
            <div className="p-4 bg-[#0F243E] rounded-xl border border-white/5">
              <p className="text-[#C0C8D3] mb-1">Total Users</p>
              <p className="text-white">{users.length}</p>
            </div>
            <div className="p-4 bg-[#0F243E] rounded-xl border border-white/5">
              <p className="text-[#C0C8D3] mb-1">System Status</p>
              <p className="text-[#28A745]">Operational</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
