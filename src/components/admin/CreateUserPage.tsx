import { useState } from "react";
import { UserPlus, Mail, Phone, Eye, EyeOff, Copy, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { toast } from "sonner";
import { usersAPI } from "../../services/apiService";

export function CreateUserPage() {
  const [role, setRole] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [assignedStudents, setAssignedStudents] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [accountStatus, setAccountStatus] = useState("active");
  const [sendCredentialsEmail, setSendCredentialsEmail] = useState(true);
  const [sendCredentialsSMS, setSendCredentialsSMS] = useState(false);
  const [autoGenerateUsername, setAutoGenerateUsername] = useState(true);

  // Auto-generate username from full name
  const handleNameChange = (name: string) => {
    setFullName(name);
    if (autoGenerateUsername && name) {
      const parts = name.trim().split(" ");
      if (parts.length > 0) {
        const firstName = parts[0].toLowerCase();
        const lastName = parts[parts.length - 1]?.toLowerCase() || "";
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
        const generatedUsername = lastName 
          ? `${firstName.charAt(0)}${lastName}${randomNum}` 
          : `${firstName}${randomNum}`;
        setUsername(generatedUsername);
      }
    }
  };

  // Auto-generate strong password
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let newPassword = "";
    for (let i = 0; i < 12; i++) {
      newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(newPassword);
    toast.success("Strong password generated");
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    toast.success("Password copied to clipboard");
  };

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(username);
    toast.success("Username copied to clipboard");
  };

  const handleSubmit = async () => {
    if (!role || !fullName || !email || !phone || !username || !password) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate role-specific assignments
    if (role === "teacher" && assignedSubjects.length === 0) {
      toast.error("Please assign at least one subject to the teacher");
      return;
    }
    
    if (role === "parent" && assignedStudents.length === 0) {
      toast.error("Please link at least one student to the parent account");
      return;
    }

    const userData = {
      role,
      fullName,
      email,
      phone,
      username,
      password,
      assignments: {
        classes: assignedClasses,
        subjects: assignedSubjects,
        students: assignedStudents
      },
      permissions,
      responsibilities,
      status: accountStatus,
      credentialsSent: {
        email: sendCredentialsEmail,
        sms: sendCredentialsSMS
      }
    };

    try {
      // Call the API to create the user
      const response = await usersAPI.create(userData);
      console.log("User created successfully:", response);

      const credentialMethod = sendCredentialsEmail && sendCredentialsSMS 
        ? "Email & SMS" 
        : sendCredentialsEmail 
        ? "Email" 
        : sendCredentialsSMS 
        ? "SMS" 
        : "not sent";

      if (credentialMethod !== "not sent") {
        toast.success(`User created successfully — credentials sent via ${credentialMethod}`);
      } else {
        toast.success("User created successfully — credentials not sent");
      }

      // Reset form
      setRole("");
      setFullName("");
      setEmail("");
      setPhone("");
      setUsername("");
      setPassword("");
      setAssignedSubjects([]);
      setAssignedClasses([]);
      setAssignedStudents([]);
      setPermissions([]);
      setResponsibilities([]);
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Failed to create user. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-white mb-2">Create User</h1>
        <p className="text-[#C0C8D3]">Add new system user with role-based access</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
            <CardHeader className="p-5 border-b border-white/10">
              <h3 className="text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                User Information
              </h3>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label className="text-white">User Role *</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                    <SelectValue placeholder="Select user role" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0F243E] border-white/10">
                    <SelectItem value="admin" className="text-white hover:bg-[#1E90FF]">Admin</SelectItem>
                    <SelectItem value="teacher" className="text-white hover:bg-[#1E90FF]">Teacher</SelectItem>
                    <SelectItem value="accountant" className="text-white hover:bg-[#1E90FF]">Accountant</SelectItem>
                    <SelectItem value="parent" className="text-white hover:bg-[#1E90FF]">Parent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Two Column Layout */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label className="text-white">Full Name *</Label>
                  <Input
                    value={fullName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Enter full name"
                    className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label className="text-white">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#C0C8D3]" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="h-12 pl-10 rounded-xl border border-white/10 bg-[#0F243E] text-white"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label className="text-white">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#C0C8D3]" />
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="080XXXXXXXX"
                      className="h-12 pl-10 rounded-xl border border-white/10 bg-[#0F243E] text-white"
                    />
                  </div>
                </div>

                {/* Account Status */}
                <div className="space-y-2">
                  <Label className="text-white">Account Status</Label>
                  <Select value={accountStatus} onValueChange={setAccountStatus}>
                    <SelectTrigger className="h-12 rounded-xl border border-white/10 bg-[#0F243E] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0F243E] border-white/10">
                      <SelectItem value="active" className="text-white hover:bg-[#1E90FF]">Active</SelectItem>
                      <SelectItem value="inactive" className="text-white hover:bg-[#1E90FF]">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Role-specific assignments and responsibilities */}
              {role && (
                <div className="space-y-4 p-4 bg-[#0F243E] rounded-xl border border-white/10">
                  <h4 className="text-white font-medium">
                    {role === "admin" && "Administrator Responsibilities"}
                    {role === "teacher" && "Teacher Assignments & Responsibilities"}
                    {role === "accountant" && "Accountant Responsibilities"}
                    {role === "parent" && "Parent Access & Responsibilities"}
                  </h4>
                  
                  {/* Admin Responsibilities */}
                  {role === "admin" && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-white text-sm">System Permissions</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            "User Management",
                            "System Settings", 
                            "Reports & Analytics",
                            "Data Backup",
                            "Security Management",
                            "Curriculum Management"
                          ].map((perm) => (
                            <div key={perm} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`perm-${perm}`}
                                checked={permissions.includes(perm)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setPermissions([...permissions, perm]);
                                  } else {
                                    setPermissions(permissions.filter(p => p !== perm));
                                  }
                                }}
                                className="rounded border-white/20 bg-[#132C4A] text-[#1E90FF]"
                              />
                              <label htmlFor={`perm-${perm}`} className="text-xs text-[#C0C8D3]">
                                {perm}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Teacher Assignments */}
                  {role === "teacher" && (
                    <div className="space-y-3">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white text-sm">Assign Classes</Label>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {["JSS 1A", "JSS 1B", "JSS 2A", "JSS 2B", "SS 1A", "SS 1B", "SS 2A", "SS 2B", "SS 3A", "SS 3B"].map((cls) => (
                              <div key={cls} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`class-${cls}`}
                                  checked={assignedClasses.includes(cls)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setAssignedClasses([...assignedClasses, cls]);
                                    } else {
                                      setAssignedClasses(assignedClasses.filter(c => c !== cls));
                                    }
                                  }}
                                  className="rounded border-white/20 bg-[#132C4A] text-[#1E90FF]"
                                />
                                <label htmlFor={`class-${cls}`} className="text-xs text-[#C0C8D3]">
                                  {cls}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-white text-sm">Assign Subjects</Label>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {["Mathematics", "English Language", "Physics", "Chemistry", "Biology", "History", "Geography", "Economics", "Computer Studies", "Physical Education"].map((subj) => (
                              <div key={subj} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`subj-${subj}`}
                                  checked={assignedSubjects.includes(subj)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setAssignedSubjects([...assignedSubjects, subj]);
                                    } else {
                                      setAssignedSubjects(assignedSubjects.filter(s => s !== subj));
                                    }
                                  }}
                                  className="rounded border-white/20 bg-[#132C4A] text-[#1E90FF]"
                                />
                                <label htmlFor={`subj-${subj}`} className="text-xs text-[#C0C8D3]">
                                  {subj}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-white text-sm">Additional Responsibilities</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {["Class Teacher", "Subject Head", "Sports Coordinator", "Club Advisor", "Exam Supervisor", "Discipline Committee"].map((resp) => (
                            <div key={resp} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`resp-${resp}`}
                                checked={responsibilities.includes(resp)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setResponsibilities([...responsibilities, resp]);
                                  } else {
                                    setResponsibilities(responsibilities.filter(r => r !== resp));
                                  }
                                }}
                                className="rounded border-white/20 bg-[#132C4A] text-[#1E90FF]"
                              />
                              <label htmlFor={`resp-${resp}`} className="text-xs text-[#C0C8D3]">
                                {resp}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Accountant Responsibilities */}
                  {role === "accountant" && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-white text-sm">Financial Responsibilities</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {["Fee Collection", "Payroll Management", "Budget Planning", "Financial Reporting", "Invoice Generation", "Expense Tracking"].map((resp) => (
                            <div key={resp} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`acc-${resp}`}
                                checked={responsibilities.includes(resp)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setResponsibilities([...responsibilities, resp]);
                                  } else {
                                    setResponsibilities(responsibilities.filter(r => r !== resp));
                                  }
                                }}
                                className="rounded border-white/20 bg-[#132C4A] text-[#1E90FF]"
                              />
                              <label htmlFor={`acc-${resp}`} className="text-xs text-[#C0C8D3]">
                                {resp}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Parent Access */}
                  {role === "parent" && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-white text-sm">Link Students (Enter Admission Numbers)</Label>
                        <textarea
                          placeholder="Enter admission numbers separated by commas..."
                          className="w-full h-20 rounded-lg border border-white/20 bg-[#132C4A] text-white p-3 text-sm"
                          onChange={(e) => {
                            const students = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                            setAssignedStudents(students);
                          }}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-white text-sm">Parental Access Permissions</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {["View Academic Reports", "View Attendance", "View Fee Status", "Communicate with Teachers", "View Timetable", "Receive Notifications"].map((perm) => (
                            <div key={perm} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`parent-${perm}`}
                                checked={permissions.includes(perm)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setPermissions([...permissions, perm]);
                                  } else {
                                    setPermissions(permissions.filter(p => p !== perm));
                                  }
                                }}
                                className="rounded border-white/20 bg-[#132C4A] text-[#1E90FF]"
                              />
                              <label htmlFor={`parent-${perm}`} className="text-xs text-[#C0C8D3]">
                                {perm}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Login Credentials Section */}
              <div className="space-y-4 p-4 bg-[#0F243E] rounded-xl border border-[#1E90FF]">
                <h4 className="text-white">Login Credentials</h4>
                
                {/* Username */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-white">Username *</Label>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-[#C0C8D3]">Auto-generate</Label>
                      <Switch 
                        checked={autoGenerateUsername} 
                        onCheckedChange={setAutoGenerateUsername}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="username"
                      disabled={autoGenerateUsername}
                      className="h-12 rounded-xl border border-white/10 bg-[#132C4A] text-white disabled:opacity-60"
                    />
                    <Button
                      type="button"
                      onClick={handleCopyUsername}
                      disabled={!username}
                      className="h-12 px-4 bg-[#1E90FF] hover:bg-[#00BFFF] rounded-xl"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label className="text-white">Password *</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter or generate password"
                        className="h-12 pr-10 rounded-xl border border-white/10 bg-[#132C4A] text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#C0C8D3] hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      onClick={generatePassword}
                      className="h-12 px-4 bg-[#FFC107] hover:bg-[#FFC107]/90 rounded-xl"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCopyPassword}
                      disabled={!password}
                      className="h-12 px-4 bg-[#1E90FF] hover:bg-[#00BFFF] rounded-xl"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  {password && (
                    <p className="text-xs text-[#FFC107]">
                      ⚠️ Temporary password expires in 24 hours — user must reset
                    </p>
                  )}
                </div>
              </div>

              {/* Send Credentials Options */}
              <div className="space-y-3 p-4 bg-[#0F243E] rounded-xl border border-white/10">
                <Label className="text-white">Send Credentials</Label>
                <div className="flex items-center justify-between p-3 bg-[#132C4A] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-[#1E90FF]" />
                    <span className="text-white">Send via Email</span>
                  </div>
                  <Switch checked={sendCredentialsEmail} onCheckedChange={setSendCredentialsEmail} />
                </div>
                <div className="flex items-center justify-between p-3 bg-[#132C4A] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-[#28A745]" />
                    <span className="text-white">Send via SMS</span>
                  </div>
                  <Switch checked={sendCredentialsSMS} onCheckedChange={setSendCredentialsSMS} />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSubmit}
                  className="flex-1 h-12 bg-[#28A745] hover:bg-[#28A745]/90 text-white rounded-xl shadow-md hover:scale-105 transition-all"
                >
                  <UserPlus className="w-5 h-5 mr-2" />
                  Create User
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setRole("");
                    setFullName("");
                    setEmail("");
                    setPhone("");
                    setUsername("");
                    setPassword("");
                    
                    setAssignedSubjects([]);
                    setAssignedClasses([]);
                    setAssignedStudents([]);
                    setPermissions([]);
                    setResponsibilities([]);
                    toast.info("Form cleared");
                  }}
                  className="h-12 px-6 bg-[#DC3545] hover:bg-[#DC3545]/90 text-white rounded-xl"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel - Info & Tips */}
        <div className="space-y-4">
          <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
            <CardHeader className="p-4 bg-gradient-to-r from-[#1E90FF] to-[#00BFFF] rounded-t-xl">
              <h4 className="text-white">Quick Tips</h4>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="p-3 bg-[#0F243E] rounded-lg">
                <p className="text-xs text-[#C0C8D3]">
                  <span className="text-[#1E90FF]">•</span> Username auto-generates from name
                </p>
              </div>
              <div className="p-3 bg-[#0F243E] rounded-lg">
                <p className="text-xs text-[#C0C8D3]">
                  <span className="text-[#1E90FF]">•</span> Use strong passwords (12+ characters)
                </p>
              </div>
              <div className="p-3 bg-[#0F243E] rounded-lg">
                <p className="text-xs text-[#C0C8D3]">
                  <span className="text-[#1E90FF]">•</span> Credentials can be resent later
                </p>
              </div>
              <div className="p-3 bg-[#0F243E] rounded-lg">
                <p className="text-xs text-[#C0C8D3]">
                  <span className="text-[#1E90FF]">•</span> Teachers need class/subject assignment
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-[#132C4A] border border-[#FFC107]/30 shadow-lg">
            <CardHeader className="p-4 bg-[#FFC107]/10 rounded-t-xl border-b border-[#FFC107]/30">
              <h4 className="text-white">Security Notice</h4>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-xs text-[#C0C8D3] leading-relaxed">
                All user accounts are audited. Temporary passwords expire in 24 hours. 
                Users will be required to reset their password on first login.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
