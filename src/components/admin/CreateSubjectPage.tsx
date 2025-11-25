import { useState, useCallback, useMemo } from 'react';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { useSchool, Subject } from '@/contexts/SchoolContext';
import { subjectsAPI } from '@/services/apiService';
import { debounce } from '@/utils/performance';

// API response types
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string>;
}

// School level options
const SCHOOL_LEVELS: Array<{value: string, label: string}> = [
  { value: 'primary', label: 'Primary' },
  { value: 'junior_secondary', label: 'Junior Secondary' },
  { value: 'senior_secondary', label: 'Senior Secondary' },
];

// Department options
const DEPARTMENTS: string[] = [
  'Sciences',
  'Arts',
  'Commercial',
  'Technology',
  'General',
];

// Form validation
const validateForm = (data: { name: string; code: string; department: string; creditUnits: string; description: string }) => {
  const errors: Record<string, string> = {};
  
  if (!data.name.trim()) {
    errors.name = 'Subject name is required';
  } else if (data.name.length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }
  
  if (!data.code.trim()) {
    errors.code = 'Subject code is required';
  } else if (!/^[A-Za-z0-9]+$/.test(data.code)) {
    errors.code = 'Code must be alphanumeric';
  }
  
  if (!data.department) {
    errors.department = 'Please select a department';
  }
  
  if (!data.creditUnits) {
    errors.creditUnits = 'Credit units is required';
  } else if (isNaN(Number(data.creditUnits)) || Number(data.creditUnits) < 1 || Number(data.creditUnits) > 10) {
    errors.creditUnits = 'Credit units must be between 1 and 10';
  }
  
  if (data.description && data.description.length < 10) {
    errors.description = 'Description must be at least 10 characters';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

interface CreateSubjectPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function CreateSubjectPage({ onBack, onSuccess }: CreateSubjectPageProps) {
  const { addSubject } = useSchool();
  
  type SubjectStatus = 'Active' | 'Inactive';
  
  type FormData = {
    name: string;
    code: string;
    department: string;
    creditUnits: string;
    description: string;
    isCoreSubject: boolean;
    status: SubjectStatus;
  };

  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    department: 'General',
    creditUnits: '1',
    description: '',
    isCoreSubject: false,
    status: 'Active',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Memoize the validation
  const { isValid, errors: validationErrors } = useMemo(
    () => validateForm(formData),
    [formData.name, formData.code, formData.department, formData.creditUnits, formData.description]
  );
  
  // Update form data with debouncing for validation
  const updateFormData = useCallback((updates: Partial<FormData>) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));
    
    // Clear error for the field being updated
    if (updates.name) setErrors(prev => ({ ...prev, name: '' }));
    if (updates.code) setErrors(prev => ({ ...prev, code: '' }));
    if (updates.department) setErrors(prev => ({ ...prev, department: '' }));
    if (updates.creditUnits) setErrors(prev => ({ ...prev, creditUnits: '' }));
    if (updates.description) setErrors(prev => ({ ...prev, description: '' }));
  }, []);
  
  // Debounced code formatting
  const formatCode = useCallback(debounce((value: string) => {
    if (value) {
      updateFormData({ code: value.trim().toUpperCase() });
    }
  }, 300), [updateFormData]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!isValid) {
      setErrors(validationErrors);
      toast.error('Please fix the form errors');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const subjectData = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        department: formData.department,
        creditUnits: parseInt(formData.creditUnits),
        description: formData.description.trim() || null,
        isCore: formData.isCoreSubject,
        status: formData.status.toLowerCase()
      };

      // Make the API call with proper error handling
      try {
        const response = await subjectsAPI.create(subjectData);
        
        if (response && response.data) {
          const newSubject: Subject = {
            id: response.data.id,
            name: response.data.name,
            code: response.data.code,
            department: response.data.department,
            creditUnits: response.data.credit_units,
            description: response.data.description,
            isCore: response.data.is_core,
            status: response.data.status === 'active' ? 'Active' : 'Inactive'
          };
          
          addSubject(newSubject);
          toast.success("Subject created successfully!");
          
          // Reset form
          setFormData({
            name: '',
            code: '',
            department: 'General',
            creditUnits: '1',
            description: '',
            isCoreSubject: false,
            status: 'Active'
          });
          
          onSuccess();
        } else {
          toast.error('Failed to create subject');
        }
        
      } catch (apiError: any) {
        console.error('API Error:', apiError);
        
        // Handle validation errors from backend
        if (apiError?.response?.data?.errors) {
          const backendErrors = apiError.response.data.errors;
          setErrors(backendErrors);
          toast.error('Please fix the form errors');
        } else {
          const errorMessage = apiError?.response?.data?.message || apiError?.message || 'Failed to create subject';
          toast.error(errorMessage);
        }
      }
      
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack}
            disabled={isSubmitting}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
            type="button"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <CardTitle>Create New Subject</CardTitle>
            <CardDescription>
              Add a new subject to the curriculum
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Subject Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                onBlur={() => {
                  if (formData.name && !formData.code) {
                    // Auto-generate code from name if code is empty
                    const generatedCode = formData.name
                      .substring(0, 3)
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, '');
                    if (generatedCode) {
                      updateFormData({ code: generatedCode });
                    }
                  }
                }}
                placeholder="e.g. Mathematics"
                disabled={isSubmitting}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Subject Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  formatCode(value);
                }}
                placeholder="e.g. MATH101"
                disabled={isSubmitting}
                className={errors.code ? 'border-red-500' : ''}
              />
              {errors.code && (
                <p className="text-sm text-red-500">{errors.code}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select
                value={formData.department}
                onValueChange={(value: string) => updateFormData({ department: value })}
                disabled={isSubmitting}
              >
                <SelectTrigger className={errors.department ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.department && (
                <p className="text-sm text-red-500">{errors.department}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="creditUnits">Credit Units *</Label>
              <Input
                id="creditUnits"
                type="number"
                min="1"
                max="10"
                value={formData.creditUnits}
                onChange={(e) => updateFormData({ creditUnits: e.target.value })}
                placeholder="e.g. 3"
                disabled={isSubmitting}
                className={errors.creditUnits ? 'border-red-500' : ''}
              />
              {errors.creditUnits && (
                <p className="text-sm text-red-500">{errors.creditUnits}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData({ description: e.target.value })}
              placeholder="Enter subject description (optional)"
              disabled={isSubmitting}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[#1F2937] font-medium">Subject Type</Label>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isCore"
                    checked={formData.isCoreSubject}
                    onChange={(e) => updateFormData({ isCoreSubject: e.target.checked })}
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label htmlFor="isCore">Core Subject</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Label htmlFor="status">Status:</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: SubjectStatus) => 
                      updateFormData({ status: value })
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onBack}
              disabled={isSubmitting}
              className="disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting || !isValid}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Subject
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
