import { useState } from "react";
import { Save, DollarSign, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Alert, AlertDescription } from "../ui/alert";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";

export function SetFeesPage() {
  const { 
    classes, 
    currentTerm, 
    currentAcademicYear, 
    addFeeStructure, 
    updateFeeStructure, 
    getFeeStructureByClass,
    feeStructures 
  } = useSchool();

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState(currentTerm);
  const [selectedYear, setSelectedYear] = useState(currentAcademicYear);

  const [fees, setFees] = useState({
    tuitionFee: "",
    developmentLevy: "",
    sportsFee: "",
    examFee: "",
    booksFee: "",
    uniformFee: "",
    transportFee: "",
  });

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    
    // Check if fee structure already exists
    const existing = getFeeStructureByClass(Number(classId), selectedTerm, selectedYear);
    if (existing) {
      setFees({
        tuitionFee: existing.tuitionFee.toString(),
        developmentLevy: existing.developmentLevy.toString(),
        sportsFee: existing.sportsFee.toString(),
        examFee: existing.examFee.toString(),
        booksFee: existing.booksFee.toString(),
        uniformFee: existing.uniformFee.toString(),
        transportFee: existing.transportFee.toString(),
      });
    } else {
      // Reset fees
      setFees({
        tuitionFee: "",
        developmentLevy: "",
        sportsFee: "",
        examFee: "",
        booksFee: "",
        uniformFee: "",
        transportFee: "",
      });
    }
  };

  const handleFeeChange = (field: string, value: string) => {
    // Only allow numbers
    if (value === "" || /^\d+$/.test(value)) {
      setFees({ ...fees, [field]: value });
    }
  };

  const calculateTotal = () => {
    return Object.values(fees).reduce((sum, val) => sum + (val ? parseInt(val) : 0), 0);
  };

  const handleSave = () => {
    if (!selectedClassId) {
      toast.error("Please select a class");
      return;
    }

    const totalFee = calculateTotal();
    if (totalFee === 0) {
      toast.error("Please enter at least one fee amount");
      return;
    }

    const selectedClass = classes.find(c => c.id === Number(selectedClassId));
    if (!selectedClass) return;

    const feeData = {
      classId: Number(selectedClassId),
      className: selectedClass.name,
      level: selectedClass.level,
      term: selectedTerm,
      academicYear: selectedYear,
      tuitionFee: parseInt(fees.tuitionFee || "0"),
      developmentLevy: parseInt(fees.developmentLevy || "0"),
      sportsFee: parseInt(fees.sportsFee || "0"),
      examFee: parseInt(fees.examFee || "0"),
      booksFee: parseInt(fees.booksFee || "0"),
      uniformFee: parseInt(fees.uniformFee || "0"),
      transportFee: parseInt(fees.transportFee || "0"),
    };

    // Check if updating existing or creating new
    const existing = getFeeStructureByClass(Number(selectedClassId), selectedTerm, selectedYear);
    
    if (existing) {
      updateFeeStructure(existing.id, feeData);
      toast.success("Fee structure updated successfully!");
    } else {
      addFeeStructure(feeData);
      toast.success("Fee structure created successfully!");
    }
  };

  const activeClasses = classes.filter(c => c.status === 'active');

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Set Fee Structure</h1>
        <p className="text-[#6B7280]">Define and manage school fees per class and term</p>
      </div>

      <Alert className="bg-[#007C91]/10 border-[#007C91] rounded-xl">
        <AlertCircle className="h-4 w-4 text-[#007C91]" />
        <AlertDescription className="text-[#007C91]">
          Set fees for each class and term. Parents will see these fees in real-time on their dashboard.
        </AlertDescription>
      </Alert>

      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-6 border-b border-[#E5E7EB]">
          <CardTitle className="text-[#1F2937]">Fee Configuration</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label className="text-[#1F2937] mb-2 block">Class</Label>
              <Select value={selectedClassId} onValueChange={handleClassChange}>
                <SelectTrigger className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {activeClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.name} ({cls.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[#1F2937] mb-2 block">Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="First Term">First Term</SelectItem>
                  <SelectItem value="Second Term">Second Term</SelectItem>
                  <SelectItem value="Third Term">Third Term</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[#1F2937] mb-2 block">Academic Year</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2023/2024">2023/2024</SelectItem>
                  <SelectItem value="2024/2025">2024/2025</SelectItem>
                  <SelectItem value="2025/2026">2025/2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="text-[#1F2937] mb-2 block">Tuition Fee (₦)</Label>
              <Input
                type="text"
                value={fees.tuitionFee}
                onChange={(e) => handleFeeChange("tuitionFee", e.target.value)}
                placeholder="0"
                className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]"
              />
            </div>

            <div>
              <Label className="text-[#1F2937] mb-2 block">Development Levy (₦)</Label>
              <Input
                type="text"
                value={fees.developmentLevy}
                onChange={(e) => handleFeeChange("developmentLevy", e.target.value)}
                placeholder="0"
                className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]"
              />
            </div>

            <div>
              <Label className="text-[#1F2937] mb-2 block">Sports Fee (₦)</Label>
              <Input
                type="text"
                value={fees.sportsFee}
                onChange={(e) => handleFeeChange("sportsFee", e.target.value)}
                placeholder="0"
                className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]"
              />
            </div>

            <div>
              <Label className="text-[#1F2937] mb-2 block">Exam Fee (₦)</Label>
              <Input
                type="text"
                value={fees.examFee}
                onChange={(e) => handleFeeChange("examFee", e.target.value)}
                placeholder="0"
                className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]"
              />
            </div>

            <div>
              <Label className="text-[#1F2937] mb-2 block">Books Fee (₦)</Label>
              <Input
                type="text"
                value={fees.booksFee}
                onChange={(e) => handleFeeChange("booksFee", e.target.value)}
                placeholder="0"
                className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]"
              />
            </div>

            <div>
              <Label className="text-[#1F2937] mb-2 block">Uniform Fee (₦)</Label>
              <Input
                type="text"
                value={fees.uniformFee}
                onChange={(e) => handleFeeChange("uniformFee", e.target.value)}
                placeholder="0"
                className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]"
              />
            </div>

            <div>
              <Label className="text-[#1F2937] mb-2 block">Transport Fee (₦)</Label>
              <Input
                type="text"
                value={fees.transportFee}
                onChange={(e) => handleFeeChange("transportFee", e.target.value)}
                placeholder="0"
                className="rounded-lg border-[#E5E7EB] focus:border-[#007C91]"
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-[#007C91]/10 rounded-lg border border-[#007C91]">
            <div className="flex items-center justify-between">
              <span className="text-[#1F2937]">Total Fee</span>
              <span className="text-[#007C91]">₦{calculateTotal().toLocaleString()}</span>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSave}
              className="bg-[#007C91] hover:bg-[#006073] text-white rounded-xl shadow-clinical hover:shadow-clinical-lg transition-all"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Fee Structure
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Fee Structures */}
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-6 border-b border-[#E5E7EB]">
          <CardTitle className="text-[#1F2937]">Existing Fee Structures</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#007C91] text-white">
                  <th className="text-left p-4">Class</th>
                  <th className="text-left p-4">Level</th>
                  <th className="text-left p-4">Term</th>
                  <th className="text-left p-4">Year</th>
                  <th className="text-right p-4">Total Fee</th>
                </tr>
              </thead>
              <tbody>
                {feeStructures.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-[#6B7280]">
                      No fee structures created yet
                    </td>
                  </tr>
                ) : (
                  feeStructures.map((fee) => (
                    <tr key={fee.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                      <td className="p-4 text-[#1F2937]">{fee.className}</td>
                      <td className="p-4 text-[#6B7280]">{fee.level}</td>
                      <td className="p-4 text-[#6B7280]">{fee.term}</td>
                      <td className="p-4 text-[#6B7280]">{fee.academicYear}</td>
                      <td className="p-4 text-right text-[#007C91]">₦{fee.totalFee.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
