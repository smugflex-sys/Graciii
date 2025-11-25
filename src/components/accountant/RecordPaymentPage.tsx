import { useState, useEffect, useMemo } from "react";
import { Search, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";
import { paymentsAPI, feesAPI, studentsAPI } from "../../services/apiService";

export function RecordPaymentPage() {
  const {
    students,
    currentUser,
    getFeeStructureByClass,
    getStudentFeeBalance,
    addPayment,
    updateStudentFeeBalance,
    currentTerm,
    currentAcademicYear,
    payments,
  } = useSchool();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentMethod: "",
    referenceNumber: "",
  });
  const [fees, setFees] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Debounced search function
  const debouncedSearch = useMemo(
    () => {
      let timeoutId: NodeJS.Timeout;
      return async (query: string) => {
        clearTimeout(timeoutId);
        
        if (query.length < 2) {
          setSearchResults([]);
          return;
        }

        setIsSearching(true);
        timeoutId = setTimeout(async () => {
          try {
            const response = await studentsAPI.getAll({ 
              search: query, 
              limit: 10,
              status: 'Active'
            });
            const results = Array.isArray(response) ? response : (response?.data || []);
            setSearchResults(results);
          } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
          } finally {
            setIsSearching(false);
          }
        }, 300);
      };
    },
    []
  );

  // Handle search input changes
  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const selectedStudent = selectedStudentId
    ? students.find((s) => s.id === selectedStudentId)
    : null;

  const selectedFeeStructure = selectedStudent
    ? getFeeStructureByClass(selectedStudent.classId, currentTerm, currentAcademicYear)
    : null;

  const selectedFeeBalance = selectedStudent
    ? getStudentFeeBalance(selectedStudent.id, currentTerm, currentAcademicYear)
    : null;

  const handleStudentSelect = (student: any) => {
    setSelectedStudentId(student.id);
    setSearchTerm(`${student.firstName} ${student.lastName} (${student.admissionNumber})`);
    setSearchResults([]);
    
    // Fetch fees for the student's class
    feesAPI.getAll({ classId: student.classId }).then((response: any) => {
      const feeList = response?.data || [];
      setFees(Array.isArray(feeList) ? feeList : []);
    }).catch(() => {
      setFees([]);
    });
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudentId || !currentUser) {
      toast.error("Please select a student");
      return;
    }

    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (!paymentData.paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (fees.length === 0) {
      toast.error("No fees found for this student. Please contact the school.");
      return;
    }

    const amount = parseFloat(paymentData.amount);
    const balance = selectedFeeBalance?.balance || 0;

    if (amount > balance) {
      toast.error(`Payment amount exceeds balance (₦${balance.toLocaleString()})`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Use the first fee as the target
      const feeId = fees[0].id;
      const txnReference = paymentData.referenceNumber || `TRX${Date.now()}`;

      // Call backend API to create payment
      const response = await paymentsAPI.create({
        student_id: selectedStudentId,
        fee_id: feeId,
        amount_paid: amount,
        payment_method: paymentData.paymentMethod,
        transaction_id: txnReference,
      });

      const responseData = response as any;
      if (responseData?.success || responseData?.id) {
        const receiptNumber = `REC/${new Date().getFullYear()}/${String(payments.length + 1).padStart(4, '0')}`;
        addPayment({
          studentId: selectedStudentId,
          studentName: `${selectedStudent?.firstName} ${selectedStudent?.lastName}`,
          amount,
          paymentType: amount >= balance ? 'Full Payment' : 'Partial Payment',
          term: currentTerm,
          academicYear: currentAcademicYear,
          paymentMethod: paymentData.paymentMethod,
          reference: txnReference,
          recordedBy: currentUser.id,
          recordedDate: new Date().toISOString(),
          status: 'Pending',
          receiptNumber,
        });

        updateStudentFeeBalance(selectedStudentId);

        toast.success(`Payment of ₦${amount.toLocaleString()} recorded successfully! Receipt: ${receiptNumber}`);

        setSelectedStudentId(null);
        setSearchTerm("");
        setPaymentData({ amount: "", paymentMethod: "", referenceNumber: "" });
        setFees([]);
      } else {
        toast.error(responseData?.message || 'Failed to record payment. Please try again.');
      }
    } catch (error: any) {
      const errorMsg = (error?.data && (error.data.message as string)) || (error?.message as string) || 'Failed to record payment';
      toast.error(errorMsg);
      console.error('Payment recording error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Record Payment</h1>
        <p className="text-[#6B7280]">Search for student and record fee payment</p>
      </div>

      {/* Search Student */}
      <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical max-w-2xl">
        <CardHeader className="p-5 border-b border-[#E5E7EB]">
          <h3 className="text-[#1F2937]">Search Student</h3>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter student name or admission number..."
                className="h-12 pl-10 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6B7280] animate-spin" />
              )}
              
              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                  {searchResults.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => handleStudentSelect(student)}
                      className="px-4 py-3 hover:bg-[#F3F4F6] cursor-pointer border-b border-[#E5E7EB] last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[#1F2937] font-medium">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-[#6B7280] text-sm">
                            {student.admissionNumber} • {student.className}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {student.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Details & Payment Form */}
      {selectedStudent && selectedFeeBalance && (
        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical max-w-2xl">
          <CardHeader className="p-5 border-b border-[#E5E7EB]">
            <div className="flex items-center justify-between">
              <h3 className="text-[#1F2937]">Student Payment Details</h3>
              <Badge className={selectedFeeBalance.balance > 0 ? "bg-[#EF4444] text-white border-0" : "bg-[#10B981] text-white border-0"}>
                {selectedFeeBalance.balance > 0 ? "Outstanding" : "Fully Paid"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Student Info */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <p className="text-[#6B7280] mb-1">Student Name</p>
                <p className="text-[#1F2937]">{selectedStudent.firstName} {selectedStudent.lastName}</p>
              </div>
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <p className="text-[#6B7280] mb-1">Class</p>
                <p className="text-[#1F2937]">{selectedStudent.className}</p>
              </div>
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <p className="text-[#6B7280] mb-1">Total Fee</p>
                <p className="text-[#1F2937]">₦{selectedFeeStructure?.totalFee.toLocaleString() || '0'}</p>
              </div>
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <p className="text-[#6B7280] mb-1">Amount Paid</p>
                <p className="text-[#10B981]">₦{selectedFeeBalance.totalPaid.toLocaleString()}</p>
              </div>
              <div className="p-4 bg-[#FEF2F2] border border-[#EF4444] rounded-lg md:col-span-2">
                <p className="text-[#6B7280] mb-1">Outstanding Balance</p>
                <p className="text-[#1F2937] text-xl">₦{selectedFeeBalance.balance.toLocaleString()}</p>
              </div>
            </div>

            {/* Payment Form */}
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#1F2937]">Amount Paid (₦) *</Label>
                <Input
                  required
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })}
                  placeholder="Enter amount"
                  max={selectedFeeBalance.balance}
                  className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#1F2937]">Payment Method *</Label>
                <Select value={paymentData.paymentMethod} onValueChange={(value) => setPaymentData({ ...paymentData, paymentMethod: value })}>
                  <SelectTrigger className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#E5E7EB]">
                    <SelectItem value="Cash" className="text-[#1F2937]">Cash</SelectItem>
                    <SelectItem value="Bank Transfer" className="text-[#1F2937]">Bank Transfer</SelectItem>
                    <SelectItem value="POS" className="text-[#1F2937]">POS</SelectItem>
                    <SelectItem value="Online Payment" className="text-[#1F2937]">Online Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[#1F2937]">Reference Number</Label>
                <Input
                  value={paymentData.referenceNumber}
                  onChange={(e) => setPaymentData({ ...paymentData, referenceNumber: e.target.value })}
                  placeholder="Optional: Transaction/Receipt reference"
                  className="h-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[#1F2937]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedStudentId(null)}
                  className="flex-1 h-12 rounded-lg border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 h-12 bg-[#10B981] hover:bg-[#059669] text-white rounded-lg shadow-clinical hover:shadow-clinical-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {isSubmitting ? 'Processing...' : 'Record Payment'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
