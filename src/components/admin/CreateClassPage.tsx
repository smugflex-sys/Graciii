import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";
import { useSchool, Class } from "../../contexts/SchoolContext";
import { classesAPI } from "../../services/apiService";

interface CreateClassPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function CreateClassPage({ onBack, onSuccess }: CreateClassPageProps) {
  const { addClass } = useSchool();
  
  // Simple individual state for each field
  const [name, setName] = useState("");
  const [section, setSection] = useState("");
  const [capacity, setCapacity] = useState("");
  const [schoolLevel, setSchoolLevel] = useState("");
  const [status, setStatus] = useState<string>('Active');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !capacity || !schoolLevel) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const classData = {
        name,
        level: schoolLevel,
        class_teacher_id: null, // Backend expects class_teacher_id
        capacity: parseInt(capacity),
        status: status
      };

      console.log("Sending class data:", classData);
      
      // Save to database via API
      const response = await classesAPI.create(classData);
      
      console.log("API Response:", response);
      
      // Update local state with type assertion
      const responseData = response as unknown as {
        id: number;
        name: string;
        level: string;
        capacity: number;
        status: 'active' | 'inactive';
      };
      
      const newClass: Class = {
        id: responseData.id,
        name: responseData.name,
        level: responseData.level,
        section: "",
        capacity: responseData.capacity,
        currentStudents: 0,
        classTeacher: "Unassigned",
        classTeacherId: null,
        status: responseData.status,
        academicYear: new Date().getFullYear().toString()
      };
        
        addClass(newClass);
        toast.success("Class created successfully!");
        
        // Reset form
        setName("");
        setSection("");
        setCapacity("");
        setSchoolLevel("");
        setStatus("Active");
        
        onSuccess();
    } catch (error: any) {
      console.error("Error creating class:", error);
      console.error("Error data:", error?.data);
      
      const errorMessage =
        (error?.data && ((error.data.message as string) || (error.data.error as string))) ||
        (error?.message as string) ||
        "Failed to create class";
      
      toast.error(errorMessage);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="rounded-lg"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Classes
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-[#1F2937]">Create New Class</h1>
          <p className="text-[#6B7280] mt-1">Fill in the details to create a new class</p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="max-w-4xl rounded-lg bg-white border border-[#E5E7EB]">
        <CardHeader className="border-b border-[#E5E7EB] p-6">
          <h2 className="text-xl font-semibold text-[#1F2937]">Class Information</h2>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Row 1: School Level and Class Name */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[#1F2937] font-medium">School Level *</Label>
                <Select value={schoolLevel} onValueChange={setSchoolLevel}>
                  <SelectTrigger className="h-12 rounded-lg border-[#E5E7EB]">
                    <SelectValue placeholder="Select school level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Primary">Primary</SelectItem>
                    <SelectItem value="Secondary">Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1F2937] font-medium">Class Name *</Label>
                <Input
                  placeholder="e.g., JSS 1A, SS 2B, Primary 3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 rounded-lg border-[#E5E7EB]"
                />
              </div>
            </div>

            {/* Row 2: Section and Capacity */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[#1F2937] font-medium">Section (Optional)</Label>
                <Input
                  placeholder="e.g., A, B, C"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="h-12 rounded-lg border-[#E5E7EB]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1F2937] font-medium">Class Capacity *</Label>
                <Input
                  type="number"
                  placeholder="e.g., 35"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="h-12 rounded-lg border-[#E5E7EB]"
                />
              </div>
            </div>

            {/* Row 3: Status */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[#1F2937] font-medium">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-12 rounded-lg border-[#E5E7EB]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg"
              >
                <Save className="w-4 h-4 mr-2" />
                Create Class
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card className="max-w-4xl rounded-lg bg-blue-50 border border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Tips for Creating Classes</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Use clear naming conventions (e.g., JSS 1A, Primary 3B)</li>
            <li>• Set realistic capacity based on classroom size</li>
            <li>• Class teacher can be assigned later from Manage Classes page</li>
            <li>• You can edit class details anytime from the Manage Classes page</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
