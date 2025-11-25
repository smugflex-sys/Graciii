import { useState } from 'react';
import { useSchool } from '../../contexts/SchoolContext';
import { UserPlus, Save, AlertCircle, Users, Upload, X } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { studentsAPI, classesAPI } from '../../services/apiService';

export function AddStudentPage() {
  const { classes, parents, addStudent, currentAcademicYear, students } = useSchool();

  type FormData = {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: 'Male' | 'Female' | '';
    classId: string;
    parentId: string;
    photoUrl: string;
    phone: string;
  };

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    classId: '',
    parentId: '',
    photoUrl: '',
    phone: '',
  });

  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Comprehensive validation function
  const validateStudentData = (data: FormData): { [key: string]: string } => {
    const validationErrors: { [key: string]: string } = {};

    // Required field validation
    if (!data.firstName.trim()) {
      validationErrors.firstName = 'First name is required';
    } else if (data.firstName.trim().length < 2) {
      validationErrors.firstName = 'First name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(data.firstName.trim())) {
      validationErrors.firstName = 'First name can only contain letters and spaces';
    }

    if (!data.lastName.trim()) {
      validationErrors.lastName = 'Last name is required';
    } else if (data.lastName.trim().length < 2) {
      validationErrors.lastName = 'Last name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s]+$/.test(data.lastName.trim())) {
      validationErrors.lastName = 'Last name can only contain letters and spaces';
    }

    if (!data.dateOfBirth) {
      validationErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const dob = new Date(data.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      
      if (dob > today) {
        validationErrors.dateOfBirth = 'Date of birth cannot be in the future';
      } else if (age < 5 || (age === 5 && monthDiff < 0)) {
        validationErrors.dateOfBirth = 'Student must be at least 5 years old';
      } else if (age > 25 || (age === 25 && monthDiff > 0)) {
        validationErrors.dateOfBirth = 'Student age seems incorrect (too old)';
      }
    }

    if (!data.gender) {
      validationErrors.gender = 'Gender is required';
    }

    // Optional field validation
    if (data.phone && data.phone.trim()) {
      const phoneRegex = /^[0-9+\-\s()]+$/;
      if (!phoneRegex.test(data.phone.trim())) {
        validationErrors.phone = 'Invalid phone number format';
      } else if (data.phone.replace(/\D/g, '').length < 10) {
        validationErrors.phone = 'Phone number must have at least 10 digits';
      }
    }

    return validationErrors;
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      // Create preview URL
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

  // Generate a unique admission number
  const generateAdmissionNumber = (): string => {
    const year = new Date().getFullYear().toString().slice(-2);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `STU${year}${randomNum}`;
  };

  // Validate form and return true if valid
  const validateForm = (): boolean => {
    const validationErrors = validateStudentData(formData);
    
    // Add class-specific validation
    if (!formData.classId) {
      validationErrors.classId = 'Class is required';
    }
    
    // Add parent-specific validation if needed
    if (formData.parentId && formData.parentId !== 'none') {
      const parent = parents.find(p => p.id === parseInt(formData.parentId));
      if (!parent) {
        validationErrors.parentId = 'Invalid parent selected';
      }
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix all validation errors');
      return;
    }

    const selectedClass = classes.find((c) => c.id === parseInt(formData.classId));
    if (!selectedClass) {
      toast.error('Invalid class selected');
      return;
    }

    // Check class capacity
    if (selectedClass.capacity && selectedClass.currentStudents && 
        selectedClass.currentStudents >= selectedClass.capacity) {
      toast.error('Selected class has reached maximum capacity');
      return;
    }

    setIsSubmitting(true);
    try {
      // Generate admission number
      const admissionNumber = generateAdmissionNumber();
      
      // Prepare student data for API
      const studentData = {
        admissionNumber,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender === 'Male' || formData.gender === 'Female' ? formData.gender : 'Male',
        classId: parseInt(formData.classId),
        parentId: formData.parentId && formData.parentId !== 'none' ? parseInt(formData.parentId) : null,
        photoUrl: formData.photoUrl || undefined,
        phone: formData.phone || undefined,
        status: 'Active'
      };

      // Call API with proper error handling
      await studentsAPI.create(studentData);

      toast.success(
        `Student registered successfully! Admission Number: ${admissionNumber}`
      );

      // Reset form with type-safe default values
      setFormData({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        gender: '' as const,
        classId: '',
        parentId: '',
        photoUrl: '',
        phone: '',
      });
      setPhotoPreview('');
      setErrors({});
    } catch (error: any) {
      console.error('Error creating student:', error);
      
      // Enhanced error handling with specific error types
      if (error?.response?.status === 409) {
        toast.error('Registration number already exists. Please try again.');
      } else if (error?.response?.status === 400) {
        const validationErrors = error?.response?.data?.errors || {};
        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors);
          toast.error('Please fix the validation errors');
        } else {
          toast.error(error?.response?.data?.message || 'Invalid student data');
        }
      } else if (error?.response?.status === 422) {
        toast.error('Class has reached maximum capacity');
      } else {
        const message = 
          error?.response?.data?.message ||
          error?.message ||
          'Failed to register student. Please try again.';
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: '' as const, // Empty string as initial value, but type-safe
      classId: '',
      parentId: '',
      photoUrl: '',
      phone: '',
    });
    setPhotoPreview('');
    setErrors({});
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900 mb-2">Register New Student</h1>
        <p className="text-gray-600">Add a new student to the school management system</p>
      </div>

      {/* Info Alert */}
      <Alert className="bg-blue-50 border-blue-200 rounded-xl">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-gray-900">
          <strong>Student Registration Process:</strong>
          <br />
          1. Enter student personal information
          <br />
          2. Assign to a class (determines fee structure)
          <br />
          3. Optionally link to existing parent
          <br />
          4. Admission number will be auto-generated
          <br />• You can link parent later from "Link Student-Parent" page
        </AlertDescription>
      </Alert>

      {/* Registration Form */}
      <form onSubmit={handleSubmit}>
        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardHeader className="p-5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#2563EB]" />
              <h3 className="text-lg text-gray-900">Student Information</h3>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h4 className="text-md text-gray-900 font-medium">Personal Details</h4>
              
              {/* Photo Upload Section */}
              <div className="space-y-2">
                <Label className="text-gray-700">Student Photo (Optional)</Label>
                <div className="flex items-start gap-4">
                  {/* Photo Preview */}
                  <div className="flex-shrink-0">
                    {photoPreview ? (
                      <div className="relative">
                        <img
                          src={photoPreview}
                          alt="Student preview"
                          className="w-32 h-32 rounded-xl object-cover border-2 border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                        <Upload className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Upload Button */}
                  <div className="flex-1 space-y-2">
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
                      className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {photoPreview ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                    <p className="text-xs text-gray-500">
                      Upload a passport-size photo (JPG, PNG). Max size: 5MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Enter first name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={`h-12 rounded-xl border ${
                      errors.firstName ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-900`}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-red-500">{errors.firstName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Enter last name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={`h-12 rounded-xl border ${
                      errors.lastName ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-900`}
                  />
                  {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">
                    Date of Birth <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className={`h-12 rounded-xl border ${
                      errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-900`}
                  />
                  {errors.dateOfBirth && (
                    <p className="text-xs text-red-500">{errors.dateOfBirth}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">
                    Gender <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value: 'Male' | 'Female') =>
                      setFormData({ ...formData, gender: value })
                    }
                  >
                    <SelectTrigger
                      className={`h-12 rounded-xl border ${
                        errors.gender ? 'border-red-500' : 'border-gray-300'
                      } bg-white text-gray-900`}
                    >
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="Male" className="text-gray-900">
                        Male
                      </SelectItem>
                      <SelectItem value="Female" className="text-gray-900">
                        Female
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.gender && <p className="text-xs text-red-500">{errors.gender}</p>}
                </div>
              </div>
            </div>

            {/* Academic Information */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h4 className="text-md text-gray-900 font-medium">Academic Details</h4>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">
                    Assign to Class <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.classId}
                    onValueChange={(value: string) => setFormData({ ...formData, classId: value })}
                  >
                    <SelectTrigger
                      className={`h-12 rounded-xl border ${
                        errors.classId ? 'border-red-500' : 'border-gray-300'
                      } bg-white text-gray-900`}
                    >
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      {classes
                        .filter((c) => c.status.toLowerCase() === 'active')
                        .map((cls) => (
                          <SelectItem key={cls.id} value={cls.id.toString()} className="text-gray-900">
                            {cls.name} - {cls.level} ({cls.currentStudents}/{cls.capacity} students)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.classId && <p className="text-xs text-red-500">{errors.classId}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Phone Number (Optional)</Label>
                  <Input
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`h-12 rounded-xl border ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    } bg-white text-gray-900`}
                  />
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Academic Year</Label>
                  <Input
                    value={currentAcademicYear}
                    disabled
                    className="h-12 rounded-xl border border-gray-300 bg-gray-100 text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Parent Information */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h4 className="text-md text-gray-900 font-medium">Parent/Guardian Information</h4>

              <div className="space-y-2">
                <Label className="text-gray-700">Link to Existing Parent (Optional)</Label>
                <Select
                  value={formData.parentId}
                  onValueChange={(value: string) => setFormData({ ...formData, parentId: value })}
                >
                  <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900">
                    <SelectValue placeholder="Select parent (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    <SelectItem value="none" className="text-gray-900">
                      No parent linked
                    </SelectItem>
                    {parents
                      .filter((p) => p.status.toLowerCase() === 'active')
                      .map((parent) => (
                        <SelectItem key={parent.id} value={parent.id.toString()} className="text-gray-900">
                          {parent.firstName} {parent.lastName} - {parent.phone}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  You can link parent now or later from "Link Student-Parent" page
                </p>
              </div>
            </div>

            {/* Preview */}
            {formData.firstName && formData.lastName && (
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-gray-700">
                  <strong>Preview:</strong>
                </p>
                <p className="text-gray-900">
                  Student: {formData.firstName} {formData.lastName}
                </p>
                {formData.classId && (
                  <p className="text-gray-600 text-sm">
                    Class: {classes.find((c) => c.id === parseInt(formData.classId))?.name}
                  </p>
                )}
                <p className="text-gray-600 text-sm">
                  Admission Number: {generateAdmissionNumber()} (will be auto-generated)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            onClick={handleReset}
            variant="outline"
            className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Reset Form
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Registering...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Register Student
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Students</p>
              <Users className="w-5 h-5 text-[#2563EB]" />
            </div>
            <p className="text-2xl text-gray-900">{students.length}</p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Active Classes</p>
              <Users className="w-5 h-5 text-[#10B981]" />
            </div>
            <p className="text-2xl text-gray-900">
              {classes.filter((c) => c.status.toLowerCase() === 'active').length}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Registered Parents</p>
              <Users className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <p className="text-2xl text-gray-900">{parents.length}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
