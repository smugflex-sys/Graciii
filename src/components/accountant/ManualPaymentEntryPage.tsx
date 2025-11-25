import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { DollarSign, Search, Plus, Edit, Trash2, Save, X, Receipt, CreditCard, Banknote, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSchool } from "../../contexts/SchoolContext";
import { feesAPI, paymentsAPI } from "../../services/apiService";

interface PaymentEntry {
  id: number;
  studentId: number;
  studentName: string;
  className: string;
  amount: number;
  paymentMethod: "cash" | "bank_transfer" | "cheque";
  paymentDate: string;
  termId: number;
  sessionId: number;
  referenceNumber?: string;
  bankName?: string;
  notes?: string;
  recordedBy: string;
  recordedAt: string;
}

interface Fee {
  id: number;
  fee_type: string;
  amount: number;
  due_date?: string;
  class_id: number;
  term_id: number;
  session_id: number;
}

export function ManualPaymentEntryPage() {
  const { students, classes, currentTerm, currentAcademicYear, currentUser, addPayment } = useSchool();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFees, setIsLoadingFees] = useState(false);

  // Fees state
  const [fees, setFees] = useState<Fee[]>([]);
  const [selectedFeeId, setSelectedFeeId] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    amount: "",
    paymentMethod: "cash" as "cash" | "bank_transfer" | "cheque",
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: "",
    bankName: "",
    notes: ""
  });

  // Payment history from backend
  const [paymentHistory, setPaymentHistory] = useState<PaymentEntry[]>([]);

  // Load payment history on mount
  useEffect(() => {
    loadPaymentHistory();
  }, []);

  const loadPaymentHistory = async () => {
    try {
      setPaymentHistory([]);
    } catch (error: any) {
      console.error('Error loading payment history:', error);
    } finally {
    }
  };

  // Filter students based on search
  const filteredStudents = students.filter(student => 
    student.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const loadFees = async (student: any) => {
    try {
      setIsLoadingFees(true);
      setFees([]);
      setSelectedFeeId(null);
      
      // Fetch fees for the student's class
      const response = await feesAPI.getAll({
        class: student.classId
      });
      
      const feeList = (response as any)?.data || (Array.isArray(response) ? response : []);
      setFees(feeList);
      
      if (feeList.length > 0) {
        setSelectedFeeId(feeList[0].id);
      }
    } catch (error: any) {
      console.error('Error loading fees:', error);
      toast.error('Failed to load fees for this student');
    } finally {
      setIsLoadingFees(false);
    }
  };

  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
    setSearchQuery("");
    loadFees(student);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      amount: "",
      paymentMethod: "cash",
      paymentDate: new Date().toISOString().split('T')[0],
      referenceNumber: "",
      bankName: "",
      notes: ""
    });
    setSelectedStudent(null);
    setSelectedFeeId(null);
    setFees([]);
  };

  const handleSubmit = async () => {
    if (!selectedStudent) {
      toast.error("Please select a student");
      return;
    }

    if (!selectedFeeId) {
      toast.error("Please select a fee");
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (formData.paymentMethod === "bank_transfer" && !formData.referenceNumber) {
      toast.error("Please enter reference number for bank transfer");
      return;
    }

    try {
      setIsSaving(true);
      
      const studentClass = classes.find(c => c.id === selectedStudent.classId);
      const selectedFee = fees.find(f => f.id === selectedFeeId);
      
      // Call backend API to record manual payment
      const backendPayload = {
        student_id: selectedStudent.id,
        fee_id: selectedFeeId,
        amount_paid: parseFloat(formData.amount),
        payment_method: formData.paymentMethod,
        payment_date: formData.paymentDate,
        transaction_id: formData.referenceNumber || null
      };
      
      const backendResponse = await paymentsAPI.manual(backendPayload);
      
      if ((backendResponse as any)?.success) {
        // Also update local state and SchoolContext
        const newPaymentId = (backendResponse as any)?.data?.id || (paymentHistory.length > 0 ? Math.max(...paymentHistory.map(p => p.id)) + 1 : 1);
        
        const newPayment: PaymentEntry = {
          id: newPaymentId,
          studentId: selectedStudent.id,
          studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
          className: studentClass?.name || "N/A",
          amount: parseFloat(formData.amount),
          paymentMethod: formData.paymentMethod,
          paymentDate: formData.paymentDate,
          termId: selectedFee?.term_id || 0,
          sessionId: selectedFee?.session_id || 0,
          referenceNumber: formData.referenceNumber || undefined,
          bankName: formData.bankName || undefined,
          notes: formData.notes || undefined,
          recordedBy: currentUser?.email || "Accountant",
          recordedAt: new Date().toISOString()
        };

        setPaymentHistory(prev => [newPayment, ...prev]);

        // Also add to global payments in SchoolContext
        addPayment({
          studentId: selectedStudent.id,
          studentName: newPayment.studentName,
          amount: newPayment.amount,
          paymentType: 'Manual',
          term: currentTerm,
          academicYear: currentAcademicYear,
          paymentMethod: newPayment.paymentMethod,
          reference: newPayment.referenceNumber || '',
          recordedBy: currentUser?.id ?? 0,
          recordedDate: new Date().toISOString(),
          status: 'Verified',
          receiptNumber: newPayment.referenceNumber || `MAN-${Date.now()}`,
        });

        toast.success("Payment recorded successfully!");
        resetForm();
      } else {
        toast.error((backendResponse as any)?.message || "Failed to record payment");
      }
    } catch (error: any) {
      console.error('Error saving payment:', error);
      toast.error(error?.message || "Failed to save payment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this payment record?")) {
      setPaymentHistory(prev => prev.filter(p => p.id !== id));
      toast.success("Payment record deleted");
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "cash":
        return <Banknote className="h-4 w-4" />;
      case "bank_transfer":
        return <CreditCard className="h-4 w-4" />;
      case "cheque":
        return <Receipt className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Manual Payment Entry</h2>
        <p className="text-muted-foreground">
          Record cash and bank transfer payments manually
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recorded Today</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{paymentHistory
                .filter(p => p.paymentDate === new Date().toISOString().split('T')[0])
                .reduce((sum, p) => sum + p.amount, 0)
                .toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentHistory.filter(p => p.paymentDate === new Date().toISOString().split('T')[0]).length} payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Payments</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{paymentHistory
                .filter(p => p.paymentMethod === "cash")
                .reduce((sum, p) => sum + p.amount, 0)
                .toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentHistory.filter(p => p.paymentMethod === "cash").length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bank Transfers</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{paymentHistory
                .filter(p => p.paymentMethod === "bank_transfer")
                .reduce((sum, p) => sum + p.amount, 0)
                .toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {paymentHistory.filter(p => p.paymentMethod === "bank_transfer").length} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Payment Entry
          </CardTitle>
          <CardDescription>
            Enter payment details for cash or bank transfer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Student Selection */}
          <div className="space-y-2">
            <Label>Select Student *</Label>
            {selectedStudent ? (
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium">
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedStudent.admissionNumber} • {classes.find(c => c.id === selectedStudent.classId)?.name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStudent(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or admission number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {searchQuery && (
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {filteredStudents.length > 0 ? (
                      filteredStudents.map(student => (
                        <div
                          key={student.id}
                          className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                          onClick={() => handleStudentSelect(student)}
                        >
                          <p className="font-medium">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {student.admissionNumber} • {classes.find(c => c.id === student.classId)?.name}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="p-4 text-center text-muted-foreground">No students found</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fee Selection */}
          {selectedStudent && (
            <div className="space-y-2">
              <Label htmlFor="fee">Select Fee *</Label>
              {isLoadingFees ? (
                <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading fees...</span>
                </div>
              ) : fees.length > 0 ? (
                <Select
                  value={selectedFeeId?.toString() || ""}
                  onValueChange={(value) => setSelectedFeeId(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fees.map(fee => (
                      <SelectItem key={fee.id} value={fee.id.toString()}>
                        {fee.fee_type} - ₦{fee.amount.toLocaleString()}
                        {fee.due_date && ` (Due: ${new Date(fee.due_date).toLocaleDateString()})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 border rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  No fees found for this student's class
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₦) *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleInputChange("amount", e.target.value)}
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => handleInputChange("paymentMethod", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date *</Label>
              <Input
                id="paymentDate"
                type="date"
                value={formData.paymentDate}
                onChange={(e) => handleInputChange("paymentDate", e.target.value)}
              />
            </div>

            {/* Reference Number (for bank transfers) */}
            {formData.paymentMethod === "bank_transfer" && (
              <div className="space-y-2">
                <Label htmlFor="referenceNumber">Reference Number *</Label>
                <Input
                  id="referenceNumber"
                  placeholder="TRX123456789"
                  value={formData.referenceNumber}
                  onChange={(e) => handleInputChange("referenceNumber", e.target.value)}
                />
              </div>
            )}

            {/* Bank Name (for bank transfers) */}
            {formData.paymentMethod === "bank_transfer" && (
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  placeholder="e.g., First Bank"
                  value={formData.bankName}
                  onChange={(e) => handleInputChange("bankName", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes about this payment..."
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Record Payment
                </>
              )}
            </Button>
            {selectedStudent && (
              <Button variant="outline" onClick={resetForm} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payment Records</CardTitle>
          <CardDescription>
            View and manage manually recorded payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{payment.studentName}</TableCell>
                    <TableCell>{payment.className}</TableCell>
                    <TableCell className="font-semibold">₦{payment.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {getPaymentMethodIcon(payment.paymentMethod)}
                        {payment.paymentMethod.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payment.referenceNumber || "-"}
                    </TableCell>
                    <TableCell className="text-sm">{payment.recordedBy}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(payment.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payment records yet</p>
              <p className="text-sm text-muted-foreground">Start by recording a new payment above</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
