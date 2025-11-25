import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { useSchool } from '../../contexts/SchoolContext';
import { paymentsAPI } from '../../services/apiService';

export function VerifyReceiptsPage() {
  const { payments, verifyPayment, updatePayment, updateStudentFeeBalance, fetchPendingPayments } = useSchool();
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  // Get pending payments only
  const pendingPayments = payments.filter((p) => p.status === 'Pending');

  const handleVerify = async (paymentId: number) => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;

    try {
      await paymentsAPI.verify({ id: paymentId });
      verifyPayment(paymentId);
      updateStudentFeeBalance(payment.studentId);
      toast.success(`Payment ${payment.receiptNumber} verified successfully!`);
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      const message = (error?.data?.message || error?.message || 'Failed to verify payment');
      toast.error(message);
    }
  };

  const handleReject = () => {
    if (!selectedPayment) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    updatePayment(selectedPayment.id, { status: 'Rejected' });
    toast.error(`Payment ${selectedPayment.receiptNumber} rejected`);
    setIsRejectDialogOpen(false);
    setSelectedPayment(null);
    setRejectionReason('');
  };

  const openRejectDialog = (payment: any) => {
    setSelectedPayment(payment);
    setIsRejectDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Verify Payment Receipts</h1>
        <p className="text-[#6B7280]">Review and verify pending payment submissions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#6B7280]">Pending Verification</p>
              <FileText className="w-5 h-5 text-[#F59E0B]" />
            </div>
            <p className="text-3xl text-[#1F2937]">{pendingPayments.length}</p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#6B7280]">Total Amount</p>
              <CheckCircle className="w-5 h-5 text-[#10B981]" />
            </div>
            <p className="text-3xl text-[#1F2937]">
              ₦{pendingPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#6B7280]">Verified Today</p>
              <CheckCircle className="w-5 h-5 text-[#3B82F6]" />
            </div>
            <p className="text-3xl text-[#1F2937]">
              {
                payments.filter(
                  (p) =>
                    p.status === 'Verified' &&
                    new Date(p.recordedDate).toDateString() === new Date().toDateString()
                ).length
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments Table */}
      <Card className="rounded-lg bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-5 border-b border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <h3 className="text-[#1F2937]">Pending Payment Verifications</h3>
            <Badge className="bg-[#F59E0B] text-white border-0">{pendingPayments.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#2563EB] border-none hover:bg-[#2563EB]">
                  <TableHead className="text-white">Date</TableHead>
                  <TableHead className="text-white">Student Name</TableHead>
                  <TableHead className="text-white">Receipt No.</TableHead>
                  <TableHead className="text-white">Amount</TableHead>
                  <TableHead className="text-white">Payment Type</TableHead>
                  <TableHead className="text-white">Method</TableHead>
                  <TableHead className="text-white">Reference</TableHead>
                  <TableHead className="text-white text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPayments.length === 0 ? (
                  <TableRow className="bg-white">
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <CheckCircle className="w-12 h-12 text-[#10B981]" />
                        <p className="text-[#1F2937]">No pending payments to verify</p>
                        <p className="text-[#6B7280] text-sm">All payments have been processed</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingPayments.map((payment) => (
                    <TableRow
                      key={payment.id}
                      className="bg-white border-b border-[#E5E7EB] hover:bg-[#F9FAFB]"
                    >
                      <TableCell className="text-[#1F2937]">
                        {new Date(payment.recordedDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-[#1F2937] font-medium">{payment.studentName}</TableCell>
                      <TableCell className="text-[#6B7280] font-mono text-sm">
                        {payment.receiptNumber}
                      </TableCell>
                      <TableCell className="text-[#1F2937] font-medium">
                        ₦{payment.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-[#6B7280]">{payment.paymentType}</TableCell>
                      <TableCell className="text-[#6B7280]">{payment.paymentMethod}</TableCell>
                      <TableCell className="text-[#6B7280] font-mono text-xs">{payment.reference}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            onClick={() => handleVerify(payment.id)}
                            size="sm"
                            className="bg-[#10B981] hover:bg-[#059669] text-white rounded-lg h-8 shadow-clinical hover:shadow-clinical-lg transition-all"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Verify
                          </Button>
                          <Button
                            onClick={() => openRejectDialog(payment)}
                            size="sm"
                            variant="outline"
                            className="border-[#EF4444] text-[#EF4444] hover:bg-[#FEF2F2] rounded-lg h-8"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="max-w-md rounded-lg bg-white border border-[#E5E7EB] text-[#1F2937]">
          <DialogHeader>
            <DialogTitle className="text-[#1F2937]">Reject Payment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedPayment && (
              <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                <p className="text-sm text-[#6B7280] mb-2">Payment Details:</p>
                <p className="text-[#1F2937] font-medium">{selectedPayment.studentName}</p>
                <p className="text-[#6B7280] text-sm">
                  Receipt: {selectedPayment.receiptNumber} | Amount: ₦
                  {selectedPayment.amount.toLocaleString()}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-[#1F2937]">
                Reason for Rejection <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Enter reason for rejecting this payment..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="rounded-lg border border-[#E5E7EB] bg-white text-[#1F2937]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => {
                setIsRejectDialogOpen(false);
                setSelectedPayment(null);
                setRejectionReason('');
              }}
              variant="outline"
              className="rounded-lg border-[#E5E7EB] text-[#6B7280]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-lg"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
