import { useState, useEffect } from 'react';
import { useSchool } from '../../contexts/SchoolContext';
import { CreditCard, Download, Receipt, AlertCircle, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';
import { paymentsAPI, feesAPI } from '../../services/apiService';

export function PayFeePage() {
  const {
    currentUser,
    students,
    parents,
    payments,
    getFeeStructureByClass,
    getStudentFeeBalance,
    addPayment,
    updateStudentFeeBalance,
    currentTerm,
    currentAcademicYear,
    fetchPaymentsByStudent,
  } = useSchool();

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [reference, setReference] = useState('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isFeeStructureDialogOpen, setIsFeeStructureDialogOpen] = useState(false);
  const [fees, setFees] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load backend payment history and fees when a student is selected
  useEffect(() => {
    if (!selectedStudentId) return;
    fetchPaymentsByStudent(selectedStudentId);
    
    // Fetch fees for the student's class
    const student = students.find(s => s.id === selectedStudentId);
    if (student) {
      feesAPI.getAll({ class: student.classId }).then((feeList: any) => {
        const list = Array.isArray(feeList) ? feeList : (feeList?.data ?? []);
        setFees(Array.isArray(list) ? list : []);
      }).catch(() => {
        setFees([]);
      });
    }
  }, [selectedStudentId, students]);

  // Get current parent
  const currentParent = currentUser ? parents.find((p) => p.id === currentUser.linkedId) : null;

  // Get parent's children
  const parentStudents = currentParent
    ? students.filter((s) => currentParent.studentIds.includes(s.id))
    : [];

  const selectedStudent = selectedStudentId
    ? students.find((s) => s.id === selectedStudentId)
    : null;

  const selectedFeeStructure = selectedStudent
    ? getFeeStructureByClass(selectedStudent.classId, currentTerm ?? '', currentAcademicYear ?? '')
    : null;

  const selectedFeeBalance = selectedStudent
    ? getStudentFeeBalance(selectedStudent.id, currentTerm ?? '', currentAcademicYear ?? '')
    : null;

  const studentPayments = selectedStudent
    ? payments.filter(
        (p) =>
          p.studentId === selectedStudent.id &&
          p.term === currentTerm &&
          p.academicYear === currentAcademicYear &&
          p.status === 'Verified'
      )
    : [];

  const handlePayment = async () => {
    if (!selectedStudentId || !currentUser) {
      toast.error('Please select a student');
      return;
    }

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    if (fees.length === 0) {
      toast.error('No fees found for this student. Please contact the school.');
      return;
    }

    const amount = parseFloat(paymentAmount);
    const balance = selectedFeeBalance?.balance || 0;

    if (amount > balance) {
      toast.error(`Payment amount exceeds balance (₦${balance.toLocaleString()})`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Use the first fee as the target (in a real system, you might allow fee selection)
      const feeId = fees[0].id;
      const txnReference = reference || `TRX${Date.now()}`;

      // Call backend API to create payment
      const response = await paymentsAPI.create({
        student_id: selectedStudentId,
        fee_id: feeId,
        amount_paid: amount,
        payment_method: paymentMethod,
        transaction_id: txnReference,
      });

      const responseData = response as any;
      if (responseData?.success || responseData?.id) {
        // Update local state to reflect the new payment
        const receiptNumber = `REC/${new Date().getFullYear()}/${String(payments.length + 1).padStart(4, '0')}`;
        addPayment({
          studentId: selectedStudentId,
          studentName: `${selectedStudent?.firstName} ${selectedStudent?.lastName}`,
          amount,
          paymentType: amount >= balance ? 'Full Payment' : 'Partial Payment',
          term: currentTerm || '',
          academicYear: currentAcademicYear || '',
          paymentMethod,
          reference: txnReference,
          recordedBy: currentUser.id,
          recordedDate: new Date().toISOString(),
          status: 'Pending',
          receiptNumber,
        });

          updateStudentFeeBalance(selectedStudentId);

        toast.success(
          `Payment of ₦${amount.toLocaleString()} submitted successfully! Receipt: ${receiptNumber}`
        );

        // Reset form
        setPaymentAmount('');
        setPaymentMethod('');
        setReference('');
        setIsPaymentDialogOpen(false);
      } else {
        toast.error(responseData?.message || 'Failed to submit payment. Please try again.');
      }
    } catch (error: any) {
      const errorMsg = (error?.data && (error.data.message as string)) || (error?.message as string) || 'Failed to submit payment';
      toast.error(errorMsg);
      console.error('Payment submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayFull = () => {
    if (selectedFeeBalance) {
      setPaymentAmount(selectedFeeBalance.balance.toString());
      setIsPaymentDialogOpen(true);
    }
  };

  const handleDownloadReceipt = (payment: any) => {
    toast.success(`Downloading receipt ${payment.receiptNumber}...`);
  };

  if (!currentParent) {
    return (
      <div className="space-y-6">
        <Alert className="bg-yellow-50 border-yellow-200 rounded-xl">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-gray-900">
            Parent account not found. Please contact the school administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (parentStudents.length === 0) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl text-gray-900 mb-2">Pay School Fees</h1>
          <p className="text-gray-600">Make payments for your children's school fees</p>
        </div>

        <Alert className="bg-blue-50 border-blue-200 rounded-xl">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-gray-900">
            No children linked to your account. Please contact the school administrator to link your
            children.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900 mb-2">Pay School Fees</h1>
        <p className="text-gray-600">View fee structures, balances, and make payments for your children</p>
      </div>

      {/* Children Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {parentStudents.map((student) => {
          const feeBalance = getStudentFeeBalance(student.id, currentTerm ?? '', currentAcademicYear ?? '');
          const feeStructure = getFeeStructureByClass(student.classId, currentTerm ?? '', currentAcademicYear ?? '');

          return (
            <Card
              key={student.id}
              className={`rounded-xl bg-white border shadow-sm cursor-pointer transition-all ${
                selectedStudentId === student.id
                  ? 'border-[#2563EB] shadow-md'
                  : 'border-gray-200 hover:border-[#3B82F6]'
              }`}
              onClick={() => setSelectedStudentId(student.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-lg text-gray-900 font-medium">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{student.className}</p>
                  </div>
                  {selectedStudentId === student.id && (
                    <Badge className="bg-[#2563EB] text-white border-0">Selected</Badge>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Fee:</span>
                    <span className="text-gray-900 font-medium">
                      ₦{feeStructure?.totalFee.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Paid:</span>
                    <span className="text-green-600 font-medium">
                      ₦{feeBalance?.totalPaid.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Balance:</span>
                    <span
                      className={`font-medium ${
                        (feeBalance?.balance || 0) > 0 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      ₦{feeBalance?.balance.toLocaleString() || '0'}
                    </span>
                  </div>
                </div>

                <div className="mt-3">
                  <Badge
                    className={`${
                      feeBalance?.status === 'Paid'
                        ? 'bg-[#10B981] text-white'
                        : feeBalance?.status === 'Partial'
                        ? 'bg-[#F59E0B] text-white'
                        : 'bg-[#EF4444] text-white'
                    } border-0`}
                  >
                    {feeBalance?.status || 'Unpaid'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected Student Details */}
      {selectedStudent && (
        <>
          {/* Fee Structure */}
          <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
            <CardHeader className="p-5 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#2563EB]" />
                  <h3 className="text-lg text-gray-900">
                    Fee Structure - {selectedStudent.firstName} {selectedStudent.lastName} ({selectedStudent.className})
                  </h3>
                </div>
                <Button
                  onClick={() => setIsFeeStructureDialogOpen(true)}
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-gray-300 text-gray-700"
                >
                  View Details
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Total Fee Required</p>
                  <p className="text-2xl text-gray-900">
                    ₦{selectedFeeStructure?.totalFee.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Amount Paid</p>
                  <p className="text-2xl text-green-600">
                    ₦{selectedFeeBalance?.totalPaid.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Balance Due</p>
                  <p className="text-2xl text-red-600">
                    ₦{selectedFeeBalance?.balance.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <Badge
                    className={`${
                      selectedFeeBalance?.status === 'Paid'
                        ? 'bg-[#10B981] text-white'
                        : selectedFeeBalance?.status === 'Partial'
                        ? 'bg-[#F59E0B] text-white'
                        : 'bg-[#EF4444] text-white'
                    } border-0 text-lg`}
                  >
                    {selectedFeeBalance?.status || 'Unpaid'}
                  </Badge>
                </div>
              </div>

              {(selectedFeeBalance?.balance || 0) > 0 && (
                <div className="flex gap-3 mt-4">
                  <Button
                    onClick={() => setIsPaymentDialogOpen(true)}
                    className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-xl shadow-sm"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Make Partial Payment
                  </Button>
                  <Button
                    onClick={handlePayFull}
                    className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl shadow-sm"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Pay Full Balance (₦{selectedFeeBalance?.balance.toLocaleString()})
                  </Button>
                </div>
              )}

              {selectedFeeBalance?.status === 'Paid' && (
                <Alert className="bg-green-50 border-green-200 rounded-xl mt-4">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-gray-900">
                    ✓ All fees paid for {currentTerm} - {currentAcademicYear}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
            <CardHeader className="p-5 border-b border-gray-200">
              <h3 className="text-lg text-gray-900">Payment History</h3>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#2563EB] border-none hover:bg-[#2563EB]">
                      <TableHead className="text-white">Date</TableHead>
                      <TableHead className="text-white">Receipt No.</TableHead>
                      <TableHead className="text-white">Amount</TableHead>
                      <TableHead className="text-white">Payment Type</TableHead>
                      <TableHead className="text-white">Method</TableHead>
                      <TableHead className="text-white">Status</TableHead>
                      <TableHead className="text-white text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentPayments.length === 0 ? (
                      <TableRow className="bg-white">
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <Receipt className="w-12 h-12 text-gray-400" />
                            <p className="text-gray-900">No payment records</p>
                            <p className="text-gray-500 text-sm">
                              Make your first payment to see history here
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      studentPayments.map((payment) => (
                        <TableRow key={payment.id} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                          <TableCell className="text-gray-900">
                            {new Date(payment.recordedDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-gray-900 font-mono text-sm">
                            {payment.receiptNumber}
                          </TableCell>
                          <TableCell className="text-gray-900 font-medium">
                            ₦{payment.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-gray-600">{payment.paymentType}</TableCell>
                          <TableCell className="text-gray-600">{payment.paymentMethod}</TableCell>
                          <TableCell>
                            <Badge className="bg-[#10B981] text-white border-0">{payment.status}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              onClick={() => handleDownloadReceipt(payment)}
                              size="sm"
                              variant="ghost"
                              className="text-[#2563EB] hover:bg-blue-50"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Receipt
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md rounded-xl bg-white border border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Make Payment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-gray-600">Student:</p>
              <p className="text-lg text-gray-900">
                {selectedStudent?.firstName} {selectedStudent?.lastName}
              </p>
              <p className="text-sm text-gray-600">{selectedStudent?.className}</p>
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Outstanding Balance:</span>
                <span className="text-gray-900 font-medium">
                  ₦{selectedFeeBalance?.balance.toLocaleString() || '0'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">
                Payment Amount (₦) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
              />
              <p className="text-xs text-gray-500">
                Maximum: ₦{selectedFeeBalance?.balance.toLocaleString() || '0'}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">
                Payment Method <span className="text-red-500">*</span>
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="bank_transfer" className="text-gray-900">Bank Transfer</SelectItem>
                  <SelectItem value="cash" className="text-gray-900">Cash</SelectItem>
                  <SelectItem value="pos" className="text-gray-900">Card Payment</SelectItem>
                  <SelectItem value="online" className="text-gray-900">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Transaction Reference (Optional)</Label>
              <Input
                placeholder="Enter transaction reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => setIsPaymentDialogOpen(false)}
              variant="outline"
              className="rounded-xl border-gray-300 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isSubmitting}
              className="bg-[#10B981] hover:bg-[#059669] text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Processing...' : 'Confirm Payment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fee Structure Dialog */}
      <Dialog open={isFeeStructureDialogOpen} onOpenChange={setIsFeeStructureDialogOpen}>
        <DialogContent className="max-w-2xl rounded-xl bg-white border border-gray-200 text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              Fee Structure - {selectedStudent?.className}
            </DialogTitle>
          </DialogHeader>

          {selectedFeeStructure && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  {currentTerm} - {currentAcademicYear}
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="text-gray-900">Fee Item</TableHead>
                    <TableHead className="text-gray-900 text-right">Amount (₦)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-b border-gray-100">
                    <TableCell className="text-gray-900">Tuition Fee</TableCell>
                    <TableCell className="text-gray-900 text-right">
                      {selectedFeeStructure.tuitionFee.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-b border-gray-100">
                    <TableCell className="text-gray-900">Development Levy</TableCell>
                    <TableCell className="text-gray-900 text-right">
                      {selectedFeeStructure.developmentLevy.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-b border-gray-100">
                    <TableCell className="text-gray-900">Sports Fee</TableCell>
                    <TableCell className="text-gray-900 text-right">
                      {selectedFeeStructure.sportsFee.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-b border-gray-100">
                    <TableCell className="text-gray-900">Exam Fee</TableCell>
                    <TableCell className="text-gray-900 text-right">
                      {selectedFeeStructure.examFee.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-b border-gray-100">
                    <TableCell className="text-gray-900">Books Fee</TableCell>
                    <TableCell className="text-gray-900 text-right">
                      {selectedFeeStructure.booksFee.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-b border-gray-100">
                    <TableCell className="text-gray-900">Uniform Fee</TableCell>
                    <TableCell className="text-gray-900 text-right">
                      {selectedFeeStructure.uniformFee.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-b border-gray-100">
                    <TableCell className="text-gray-900">Transport Fee</TableCell>
                    <TableCell className="text-gray-900 text-right">
                      {selectedFeeStructure.transportFee.toLocaleString()}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-blue-50">
                    <TableCell className="text-gray-900 font-bold">TOTAL FEE</TableCell>
                    <TableCell className="text-gray-900 font-bold text-right text-lg">
                      ₦{selectedFeeStructure.totalFee.toLocaleString()}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button
              onClick={() => setIsFeeStructureDialogOpen(false)}
              variant="outline"
              className="rounded-xl border-gray-300 text-gray-700"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
