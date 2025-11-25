import { useState, useEffect } from "react";
import { Search, Link as LinkIcon, Unlink, Users, UserCheck, Upload, CheckCircle, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { studentsAPI, usersAPI } from "../../services/apiService";
import { useSchool } from "../../contexts/SchoolContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";

export function LinkStudentParentPage() {
  const { students, users, updateStudent } = useSchool();
  const [studentSearch, setStudentSearch] = useState("");
  const [parentSearch, setParentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedParent, setSelectedParent] = useState<any>(null);
  const [notifyParent, setNotifyParent] = useState(true);
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [unlinkChild, setUnlinkChild] = useState<any>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [linkingErrors, setLinkingErrors] = useState<{ [key: string]: string }>({});
  
  // Get linked children count for each parent
  const getLinkedChildrenCount = (parentId: number) => {
    return students.filter(s => s.parentId === parentId).length;
  };

  // Get linked children for a parent
  const getLinkedChildren = (parentId: number) => {
    return students.filter(s => s.parentId === parentId);
  };

  // Filter parents to only show parent role users
  const parentUsers = users.filter(u => u.role === 'parent');

  const handleLinkStudentToParent = async () => {
    // ... rest of the code remains the same ...
  }

  const filteredStudents = students.filter(s => 
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.admissionNumber.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.className.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredParents = parentUsers.filter(p => 
    p.name?.toLowerCase().includes(parentSearch.toLowerCase()) ||
    p.email?.toLowerCase().includes(parentSearch.toLowerCase()) ||
    p.phone?.toLowerCase().includes(parentSearch.toLowerCase())
  );

  const validateLinking = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!selectedStudent) {
      errors.student = 'Please select a student';
    }

    if (!selectedParent) {
      errors.parent = 'Please select a parent';
    }

    // Check if student is already linked to this parent
    if (selectedStudent && selectedParent && selectedStudent.parentId === selectedParent.id) {
      errors.link = `${selectedStudent.firstName} ${selectedStudent.lastName} is already linked to ${selectedParent.name}`;
    }

    // Check if parent has reached maximum children limit (optional validation)
    if (selectedParent) {
      const currentChildren = students.filter(s => s.parentId === selectedParent.id).length;
      if (currentChildren >= 10) { // Assuming max 10 children per parent
        errors.parent = `${selectedParent.name} has reached the maximum number of children (10)`;
      }
    }

    setLinkingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLinkStudentParent = async () => {
    if (!validateLinking()) {
      toast.error("Please fix all validation errors");
      return;
    }

    setIsLinking(true);
    try {
      const response = await studentsAPI.update(selectedStudent.id, { parentId: selectedParent.id });
      
      // Check if update was successful
      if (response) {
        const notifyMsg = notifyParent ? " — Parent notified" : "";
        toast.success(`${selectedStudent.firstName || selectedStudent.name} linked to ${selectedParent.name}${notifyMsg}`);
        setSelectedStudent(null);
        setSelectedParent(null);
        setLinkingErrors({});
      } else {
        toast.error('Failed to link student to parent');
      }
    } catch (error: any) {
      console.error('Error linking student to parent:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to link student to parent';
      toast.error(errorMessage);
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkChild = (child: any) => {
    setUnlinkChild(child);
    setShowUnlinkDialog(true);
  };

  const confirmUnlink = async () => {
    if (!unlinkChild) return;

    setIsUnlinking(true);
    try {
      await studentsAPI.update(unlinkChild.id, { parentId: null });
      toast.success(`${unlinkChild.firstName || unlinkChild.name} unlinked successfully`);
      setShowUnlinkDialog(false);
      setUnlinkChild(null);
    } catch (error: any) {
      console.error('Error unlinking student:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to unlink student';
      toast.error(errorMessage);
    } finally {
      setIsUnlinking(false);
    }
  };

  const cancelUnlink = () => {
    setShowUnlinkDialog(false);
    setUnlinkChild(null);
  };

  const handleBulkImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const csv = event.target?.result as string;
            const lines = csv.split('\n');
            const headers = lines[0].split(',');
            
            // Validate CSV structure
            const requiredHeaders = ['studentId', 'parentId'];
            const hasRequiredHeaders = requiredHeaders.every(h => headers.includes(h));
            
            if (!hasRequiredHeaders) {
              toast.error('CSV must contain columns: studentId, parentId');
              return;
            }
            
            // Parse CSV data and create links
            let successCount = 0;
            for (let i = 1; i < lines.length; i++) {
              if (lines[i].trim()) {
                const values = lines[i].split(',');
                const studentId = values[headers.indexOf('studentId')]?.trim();
                const parentId = values[headers.indexOf('parentId')]?.trim();
                
                if (studentId && parentId) {
                  try {
                    await studentsAPI.update(parseInt(studentId), { parentId: parseInt(parentId) });
                    successCount++;
                  } catch (error) {
                    console.error(`Failed to link student ${studentId} to parent ${parentId}:`, error);
                  }
                }
              }
            }
            
            toast.success(`Successfully linked ${successCount} students to parents`);
          } catch (error) {
            toast.error('Failed to parse CSV file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-white mb-2">Link Student to Parent</h1>
        <p className="text-[#C0C8D3]">Connect students with their parents/guardians for portal access</p>
      </div>

      {/* Bulk Import Option */}
      <Card className="rounded-xl bg-[#132C4A] border border-[#1E90FF] shadow-lg">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#1E90FF]/20 flex items-center justify-center">
                <Upload className="w-6 h-6 text-[#1E90FF]" />
              </div>
              <div>
                <h3 className="text-white mb-1">Bulk Link (CSV Import)</h3>
                <p className="text-sm text-[#C0C8D3]">Upload CSV with format: admission_no, parent_phone_or_email</p>
              </div>
            </div>
            <Button 
              onClick={handleBulkImport}
              className="bg-[#1E90FF] hover:bg-[#00BFFF] text-white rounded-xl shadow-md"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Linking Interface */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Student Selection */}
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardHeader className="p-5 bg-gradient-to-r from-[#1E90FF] to-[#00BFFF] rounded-t-xl">
            <h3 className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Select Student
            </h3>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#C0C8D3]" />
              <Input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name, admission no, or class..."
                className="h-12 pl-10 rounded-xl border border-white/10 bg-[#0F243E] text-white"
              />
            </div>

            {/* Selected Student */}
            {selectedStudent && (
              <div className="p-4 bg-[#28A745]/10 border border-[#28A745] rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border-2 border-[#28A745]">
                      <AvatarFallback className="bg-[#28A745] text-white">
                        {(selectedStudent.full_name || selectedStudent.name || '').split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white">{selectedStudent.full_name || selectedStudent.name}</p>
                      <p className="text-sm text-[#C0C8D3]">{selectedStudent.reg_no || selectedStudent.admissionNo}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setSelectedStudent(null)}
                    size="sm"
                    className="h-8 w-8 p-0 bg-[#DC3545] hover:bg-[#DC3545]/90 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#1E90FF] text-white border-0">{selectedStudent.Class?.name || selectedStudent.class}</Badge>
                  {selectedStudent.hasParent && (
                    <Badge className="bg-[#FFC107] text-white border-0">Already Linked</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Student List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredStudents.map((student) => (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className={`w-full p-3 rounded-xl transition-all text-left ${
                    selectedStudent?.id === student.id
                      ? 'bg-[#28A745]/20 border-2 border-[#28A745]'
                      : 'bg-[#0F243E] border border-white/10 hover:border-[#1E90FF] hover:bg-[#132C4A]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-[#1E90FF] text-white text-sm">
                        {(`${student.firstName} ${student.lastName}` || 'S').split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-white">{`${student.firstName} ${student.lastName}`}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-[#C0C8D3]">{student.admissionNumber}</p>
                        <span className="text-[#C0C8D3]">•</span>
                        <p className="text-xs text-[#C0C8D3]">{student.className}</p>
                      </div>
                    </div>
                    {student.parentId && (
                      <CheckCircle className="w-4 h-4 text-[#28A745]" />
                    )}
                  </div>
                </button>
              ))}

              {filteredStudents.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-[#C0C8D3]">No students found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Parent Selection */}
        <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
          <CardHeader className="p-5 bg-gradient-to-r from-[#28A745] to-[#28A745]/80 rounded-t-xl">
            <h3 className="text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              Select Parent
            </h3>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#C0C8D3]" />
              <Input
                value={parentSearch}
                onChange={(e) => setParentSearch(e.target.value)}
                placeholder="Search by name, phone, or email..."
                className="h-12 pl-10 rounded-xl border border-white/10 bg-[#0F243E] text-white"
              />
            </div>

            {/* Selected Parent */}
            {selectedParent && (
              <div className="p-4 bg-[#28A745]/10 border border-[#28A745] rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border-2 border-[#28A745]">
                      <AvatarFallback className="bg-[#28A745] text-white">
                        {selectedParent.name.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white">{selectedParent.name}</p>
                      <p className="text-sm text-[#C0C8D3]">{selectedParent.phone}</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setSelectedParent(null)}
                    size="sm"
                    className="h-8 w-8 p-0 bg-[#DC3545] hover:bg-[#DC3545]/90 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-[#C0C8D3]">{selectedParent.email}</p>
                <div className="mt-2">
                  <Badge className="bg-[#1E90FF] text-white border-0">
                    {selectedParent.linkedChildren.length} child(ren) linked
                  </Badge>
                </div>
              </div>
            )}

            {/* Parent List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredParents.map((parent) => (
                <div key={parent.id}>
                  <button
                    onClick={() => setSelectedParent(parent)}
                    className={`w-full p-3 rounded-xl transition-all text-left ${
                      selectedParent?.id === parent.id
                        ? 'bg-[#28A745]/20 border-2 border-[#28A745]'
                        : 'bg-[#0F243E] border border-white/10 hover:border-[#28A745] hover:bg-[#132C4A]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-[#28A745] text-white text-sm">
                          {parent.name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="text-white">{parent.name}</p>
                        <p className="text-xs text-[#C0C8D3] mt-1">{parent.phone}</p>
                      </div>
                      <Badge className="bg-[#1E90FF] text-white border-0 text-xs">
                        {getLinkedChildrenCount(parent.id)}
                      </Badge>
                    </div>
                  </button>

                  {/* Linked Children (when parent is selected) */}
                  {selectedParent?.id === parent.id && getLinkedChildren(parent.id).length > 0 && (
                    <div className="ml-4 mt-2 space-y-2">
                      <p className="text-xs text-[#C0C8D3]">Currently linked children:</p>
                      {getLinkedChildren(parent.id).map((child, idx) => (
                        <div 
                          key={idx}
                          className="p-2 bg-[#0F243E] rounded-lg border border-white/5 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-white text-sm">{`${child.firstName} ${child.lastName}`}</p>
                            <p className="text-xs text-[#C0C8D3]">{child.className} • Linked</p>
                          </div>
                          <Button
                            onClick={() => handleUnlinkChild(child)}
                            size="sm"
                            className="h-7 px-3 bg-[#DC3545] hover:bg-[#DC3545]/90 rounded-lg text-xs"
                          >
                            <Unlink className="w-3 h-3 mr-1" />
                            Unlink
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {filteredParents.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-[#C0C8D3]">No parents found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Link Action */}
      <Card className="rounded-xl bg-[#132C4A] border border-white/10 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#1E90FF]/20 flex items-center justify-center">
                  <LinkIcon className="w-6 h-6 text-[#1E90FF]" />
                </div>
                <div>
                  <Label className="text-white">Notify Parent of Link</Label>
                  <p className="text-sm text-[#C0C8D3]">Send in-app notification and optional email/SMS</p>
                </div>
              </div>
              <Switch 
                checked={notifyParent} 
                onCheckedChange={setNotifyParent}
              />
            </div>

            <Button
              onClick={handleLinkStudentParent}
              disabled={!selectedStudent || !selectedParent}
              className="h-12 px-8 bg-[#28A745] hover:bg-[#28A745]/90 text-white rounded-xl shadow-md hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
            >
              <LinkIcon className="w-5 h-5 mr-2" />
              Link Selected
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unlink Confirmation Dialog */}
      <AlertDialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <AlertDialogContent className="bg-[#132C4A] border border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Unlink Child?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#C0C8D3]">
              Are you sure you want to unlink {unlinkChild?.name}? The parent will lose access to this child's information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#0F243E] text-white border-white/10 hover:bg-[#132C4A]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnlink}
              className="bg-[#DC3545] hover:bg-[#DC3545]/90"
            >
              Unlink
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
