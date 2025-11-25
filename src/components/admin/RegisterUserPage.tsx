import { useState } from 'react';
import { UserPlus, Save, Upload, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { useSchool } from '../../contexts/SchoolContext';

export function RegisterUserPage() {
  const { addTeacher, addParent, addAccountant, addUser, classes } = useSchool();

  const [selectedRole, setSelectedRole] = useState<'teacher' | 'parent' | 'accountant' | ''>('');
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    // Teacher specific
    qualification: '',
    employeeId: '',
    isClassTeacher: false,
    classTeacherId: null as number | null,
    specialization: '',
    // Accountant specific
    accountantId: '',
    department: '',
    employeeLevel: '',
    // Parent specific
    occupation: '',
    address: '',
    studentIds: [] as number[],
    // Common fields
    dateOfBirth: '',
    gender: '',
    photoUrl: '',
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        setFormData({ ...formData, photoUrl: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview('');
    setFormData({ ...formData, photoUrl: '' });
  };

  const validateUserCreation = (userData: any, role: string): string[] => {
    const errors: string[] = [];
    
    // Common validations
    if (!userData.fullName || userData.fullName.trim().length < 2) {
      errors.push('Full name is required (minimum 2 characters)');
    }
    
    if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('Valid email address is required');
    }
    
    if (!userData.password || userData.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!userData.phone || userData.phone.length < 10) {
      errors.push('Valid phone number is required (minimum 10 digits)');
    }
    
    // Role-specific validations
    switch (role) {
      case 'teacher':
        if (!userData.qualification || userData.qualification.trim().length < 2) {
          errors.push('Qualification is required for teachers');
        }
        if (!userData.employeeId || userData.employeeId.trim().length < 3) {
          errors.push('Employee ID is required for teachers (minimum 3 characters)');
        }
        if (userData.isClassTeacher && (!userData.classTeacherId || userData.classTeacherId <= 0)) {
          errors.push('Please select a valid class for class teacher assignment');
        }
        break;
        
      case 'parent':
        if (!userData.studentIds || userData.studentIds.length === 0) {
          errors.push('At least one student must be linked to parent account');
        }
        if (!userData.occupation || userData.occupation.trim().length < 2) {
          errors.push('Occupation is required for parents');
        }
        if (!userData.address || userData.address.trim().length < 10) {
          errors.push('Address is required for parents (minimum 10 characters)');
        }
        break;
        
      case 'accountant':
        if (!userData.employeeId || userData.employeeId.trim().length < 3) {
          errors.push('Employee ID is required for accountants (minimum 3 characters)');
        }
        if (!userData.department || userData.department.trim().length < 2) {
          errors.push('Department is required for accountants');
        }
        break;
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRole) {
      toast.error('Please select a role');
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare user data with role-specific fields
      const userData: any = {
        fullName: `${formData.firstName} ${formData.lastName}`,
        email: formData.email || '',
        phone: formData.phone,
        password: formData.password,
        role: selectedRole,
        status: 'Active',
        // Common fields
        photoUrl: formData.photoUrl,
        dateOfBirth: formData.dateOfBirth || null,
        gender: formData.gender || null,
      };

      // Add role-specific fields
      if (selectedRole === 'teacher') {
        userData.employeeId = formData.employeeId || `TCH${Date.now()}`;
        userData.qualification = formData.qualification;
        userData.specialization = formData.specialization ? [formData.specialization] : [];
        userData.isClassTeacher = formData.isClassTeacher;
        userData.classTeacherId = formData.classTeacherId;
      } else if (selectedRole === 'parent') {
        userData.studentIds = formData.studentIds || [];
        userData.occupation = formData.occupation || '';
        userData.address = formData.address || '';
      } else if (selectedRole === 'accountant') {
        userData.employeeId = formData.accountantId || `ACC${Date.now()}`;
        userData.department = formData.department;
        userData.employeeLevel = formData.employeeLevel || 'Junior';
      }

      // Validate user data
      const validationErrors = validateUserCreation(userData, selectedRole);
      if (validationErrors.length > 0) {
        toast.error(validationErrors.join('\n'));
        return;
      }

      // Create user account with all role-specific data
      await addUser(userData);

      toast.success(`${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} registered successfully!`);

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        username: '',
        password: '',
        qualification: '',
        employeeId: '',
        isClassTeacher: false,
        classTeacherId: null,
        accountantId: '',
        department: '',
        employeeLevel: '',
        occupation: '',
        address: '',
        studentIds: [],
        specialization: '',
        dateOfBirth: '',
        gender: '',
        photoUrl: '',
      });
      setPhotoPreview('');
      setSelectedRole('');
    } catch (error: any) {
      let errorMessage = 'Failed to register user. Please try again.';
      
      if (error?.response?.status === 409) {
        errorMessage = 'A user with this email already exists';
      } else if (error?.response?.status === 400) {
        errorMessage = error?.response?.data?.message || 'Invalid data provided';
      } else if (error?.response?.status >= 500) {
        errorMessage = 'Server error occurred. Please try again later';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      console.error('Registration error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      username: '',
      password: '',
      qualification: '',
      employeeId: '',
      isClassTeacher: false,
      classTeacherId: null,
      accountantId: '',
      department: '',
      employeeLevel: '',
      occupation: '',
      address: '',
      studentIds: [],
      specialization: '',
      dateOfBirth: '',
      gender: '',
      photoUrl: '',
    });
    setPhotoPreview('');
    setSelectedRole('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center shadow-lg">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-[#1F2937] mb-1">Register User</h1>
            <p className="text-[#6B7280]">Register teachers, parents, or accountants with login credentials</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical hover:shadow-clinical-lg transition-all">
          <CardHeader className="bg-gradient-to-r from-[#F9FAFB] to-white p-6 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#3B82F6] flex items-center justify-center shadow-sm">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-[#1F2937]">User Information</h3>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            {/* Role Selection - Prominent */}
            <div className="space-y-3">
              <Label className="text-[#1F2937]">
                Select Role <span className="text-[#EF4444]">*</span>
              </Label>
              <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                <SelectTrigger className="h-14 rounded-xl border-2 border-[#E5E7EB] focus:border-[#3B82F6] bg-[#F9FAFB] text-[#1F2937] hover:bg-white transition-all shadow-sm">
                  <SelectValue placeholder="Choose user role to continue" />
                </SelectTrigger>
                <SelectContent className="bg-white border-[#E5E7EB] rounded-xl shadow-lg">
                  <SelectItem value="teacher" className="text-[#1F2937] hover:bg-[#F9FAFB] rounded-lg m-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                      Teacher
                    </div>
                  </SelectItem>
                  <SelectItem value="parent" className="text-[#1F2937] hover:bg-[#F9FAFB] rounded-lg m-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                      Parent/Guardian
                    </div>
                  </SelectItem>
                  <SelectItem value="accountant" className="text-[#1F2937] hover:bg-[#F9FAFB] rounded-lg m-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                      Accountant
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-[#6B7280]">Select the role for the user you want to register</p>
            </div>

            {selectedRole && (
              <>
                {/* Photo Upload - Enhanced */}
                <div className="space-y-3 p-6 bg-[#F9FAFB] rounded-xl border-2 border-dashed border-[#E5E7EB]">
                  <Label className="text-[#1F2937]">Profile Photo (Optional)</Label>
                  <div className="flex items-start gap-6">
                    <div className="flex-shrink-0">
                      {photoPreview ? (
                        <div className="relative group">
                          <img
                            src={photoPreview}
                            alt="Preview"
                            className="w-32 h-32 rounded-xl object-cover border-4 border-white shadow-lg ring-2 ring-[#3B82F6]/20"
                          />
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="absolute -top-2 -right-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-32 h-32 rounded-xl border-2 border-dashed border-[#CBD5E1] flex flex-col items-center justify-center bg-white hover:border-[#3B82F6] transition-all group cursor-pointer">
                          <Upload className="w-8 h-8 text-[#94A3B8] group-hover:text-[#3B82F6] mb-2 transition-colors" />
                          <span className="text-xs text-[#6B7280]">Click to upload</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <input
                        type="file"
                        id="photo-upload"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('photo-upload')?.click()}
                        className="rounded-xl border-2 border-[#E5E7EB] text-[#1F2937] hover:bg-white hover:border-[#3B82F6] transition-all shadow-sm"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {photoPreview ? 'Change Photo' : 'Upload Photo'}
                      </Button>
                      <div className="space-y-1">
                        <p className="text-xs text-[#6B7280]">• Accepted formats: JPG, PNG, GIF</p>
                        <p className="text-xs text-[#6B7280]">• Maximum file size: 5MB</p>
                        <p className="text-xs text-[#6B7280]">• Recommended: Square image 500x500px</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div className="space-y-4 pt-6 border-t-2 border-[#E5E7EB]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center">
                      <span className="text-[#3B82F6]">1</span>
                    </div>
                    <h4 className="text-[#1F2937]">Personal Details</h4>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[#1F2937]">
                        First Name <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        placeholder="Enter first name"
                        className="h-12 rounded-xl border-2 border-[#E5E7EB] focus:border-[#3B82F6] bg-white text-[#1F2937] transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#1F2937]">
                        Last Name <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        placeholder="Enter last name"
                        className="h-12 rounded-xl border-2 border-[#E5E7EB] focus:border-[#3B82F6] bg-white text-[#1F2937] transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#1F2937]">Email Address (Optional)</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="email@example.com"
                        className="h-12 rounded-xl border-2 border-[#E5E7EB] focus:border-[#3B82F6] bg-white text-[#1F2937] transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#1F2937]">
                        Phone Number <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        required
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="080XXXXXXXX"
                        className="h-12 rounded-xl border-2 border-[#E5E7EB] focus:border-[#3B82F6] bg-white text-[#1F2937] transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Role-specific fields */}
                {selectedRole === 'teacher' && (
                  <div className="space-y-4 pt-6 border-t-2 border-[#E5E7EB]">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                        <span className="text-[#10B981]">2</span>
                      </div>
                      <h4 className="text-[#1F2937]">Teacher Details</h4>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[#1F2937]">
                          Employee ID <span className="text-[#EF4444]">*</span>
                        </Label>
                        <Input
                          required
                          value={formData.employeeId}
                          onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                          placeholder="e.g., GRA/T/001"
                          className="h-12 rounded-xl border-2 border-[#E5E7EB] focus:border-[#3B82F6] bg-white text-[#1F2937] transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#1F2937]">
                          Qualification <span className="text-[#EF4444]">*</span>
                        </Label>
                        <Select
                          required
                          value={formData.qualification}
                          onValueChange={(value: string) => setFormData({ ...formData, qualification: value })}
                        >
                          <SelectTrigger className="h-12 rounded-xl border-2 border-[#E5E7EB] focus:border-[#3B82F6] bg-white text-[#1F2937] transition-all">
                            <SelectValue placeholder="Select qualification" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#E5E7EB] rounded-xl">
                            <SelectItem value="NCE" className="text-[#1F2937] rounded-lg">NCE</SelectItem>
                            <SelectItem value="B.Ed" className="text-[#1F2937] rounded-lg">B.Ed</SelectItem>
                            <SelectItem value="B.Sc" className="text-[#1F2937] rounded-lg">B.Sc</SelectItem>
                            <SelectItem value="B.A" className="text-[#1F2937] rounded-lg">B.A</SelectItem>
                            <SelectItem value="M.Ed" className="text-[#1F2937] rounded-lg">M.Ed</SelectItem>
                            <SelectItem value="M.Sc" className="text-[#1F2937] rounded-lg">M.Sc</SelectItem>
                            <SelectItem value="PhD" className="text-[#1F2937] rounded-lg">PhD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Class Teacher Assignment */}
                    <div className="p-6 bg-gradient-to-br from-[#EBF5FF] to-[#F0F9FF] rounded-xl border-2 border-[#BFDBFE] space-y-4 shadow-sm">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="classTeacher"
                          checked={formData.isClassTeacher}
                          onCheckedChange={(checked: boolean) =>
                            setFormData({
                              ...formData,
                              isClassTeacher: checked,
                              classTeacherId: checked ? formData.classTeacherId : null,
                            })
                          }
                          className="border-2 border-[#3B82F6] data-[state=checked]:bg-[#3B82F6]"
                        />
                        <Label htmlFor="classTeacher" className="text-[#1F2937] cursor-pointer">
                          Assign as Class Teacher
                        </Label>
                      </div>
                      {formData.isClassTeacher && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                          <Label className="text-[#1F2937]">
                            Assigned Class <span className="text-[#EF4444]">*</span>
                          </Label>
                          <Select
                            value={formData.classTeacherId?.toString() || ''}
                            onValueChange={(value: string) =>
                              setFormData({ ...formData, classTeacherId: parseInt(value) })
                            }
                          >
                            <SelectTrigger className="h-12 rounded-xl border-2 border-[#BFDBFE] focus:border-[#3B82F6] bg-white text-[#1F2937] transition-all">
                              <SelectValue placeholder="Select class for this teacher" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-[#E5E7EB] rounded-xl">
                              {classes
                                .filter((c) => c.status?.toLowerCase() === 'active')
                                .map((cls) => (
                                  <SelectItem key={cls.id} value={cls.id.toString()} className="text-[#1F2937] rounded-lg">
                                    {cls.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedRole === 'accountant' && (
                  <div className="space-y-4 pt-6 border-t-2 border-[#E5E7EB]">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
                        <span className="text-[#F59E0B]">2</span>
                      </div>
                      <h4 className="text-[#1F2937]">Accountant Details</h4>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[#1F2937]">
                          Employee ID <span className="text-[#EF4444]">*</span>
                        </Label>
                        <Input
                          required
                          value={formData.accountantId}
                          onChange={(e) => setFormData({ ...formData, accountantId: e.target.value })}
                          placeholder="e.g., GRA/A/001"
                          className="h-12 rounded-xl border-2 border-[#E5E7EB] focus:border-[#3B82F6] bg-white text-[#1F2937] transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[#1F2937]">
                          Department <span className="text-[#EF4444]">*</span>
                        </Label>
                        <Select
                          required
                          value={formData.department}
                          onValueChange={(value: string) => setFormData({ ...formData, department: value })}
                        >
                          <SelectTrigger className="h-12 rounded-xl border-2 border-[#E5E7EB] focus:border-[#3B82F6] bg-white text-[#1F2937] transition-all">
                            <SelectValue placeholder="Select department" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-[#E5E7EB] rounded-xl">
                            <SelectItem value="Finance" className="text-[#1F2937] rounded-lg">Finance</SelectItem>
                            <SelectItem value="Accounts" className="text-[#1F2937] rounded-lg">Accounts</SelectItem>
                            <SelectItem value="Bursar" className="text-[#1F2937] rounded-lg">Bursar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Login Credentials */}
                <div className="space-y-4 pt-6 border-t-2 border-[#E5E7EB]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
                      <span className="text-[#8B5CF6]">{selectedRole === 'parent' ? '2' : '3'}</span>
                    </div>
                    <h4 className="text-[#1F2937]">Login Credentials</h4>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[#1F2937]">
                        Username <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="Username for login"
                        className="h-12 rounded-xl border-2 border-[#E5E7EB] focus:border-[#3B82F6] bg-white text-[#1F2937] transition-all"
                      />
                      <p className="text-xs text-[#6B7280]">This will be used for system login</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[#1F2937]">
                        Password <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        required
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Initial password"
                        className="h-12 rounded-xl border-2 border-[#E5E7EB] focus:border-[#3B82F6] bg-white text-[#1F2937] transition-all"
                      />
                      <p className="text-xs text-[#6B7280]">User can change this after first login</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons - Enhanced */}
        {selectedRole && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 p-6 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
            <p className="text-sm text-[#6B7280]">
              Please review all information before submitting
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={handleReset}
                variant="outline"
                className="rounded-xl border-2 border-[#E5E7EB] text-[#1F2937] hover:bg-white hover:border-[#CBD5E1] transition-all h-12 px-6"
              >
                Reset Form
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white rounded-xl shadow-lg hover:shadow-xl transition-all h-12 px-8 hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" />
                    Register {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
