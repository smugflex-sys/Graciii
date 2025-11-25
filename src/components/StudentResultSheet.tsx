import { useRef } from "react";
import { Download, Printer, X } from "lucide-react";
import { Button } from "./ui/button";
import { useSchool, CompiledResult } from "../contexts/SchoolContext";
import { toast } from "sonner";

interface StudentResultSheetProps {
  result: CompiledResult;
  onClose: () => void;
}

export function StudentResultSheet({ result, onClose }: StudentResultSheetProps) {
  const { students, classes, schoolSettings } = useSchool();
  const printRef = useRef<HTMLDivElement>(null);

  const student = students.find(s => s.id === result.studentId);
  const classInfo = classes.find(c => c.id === result.classId);

  if (!student || !classInfo) {
    return <div>Student or class not found</div>;
  }

  const handlePrint = () => {
    window.print();
    toast.success("Opening print dialog...");
  };

  const handleDownloadPDF = async () => {
    toast.info("PDF generation temporarily disabled for security review. Use Print instead.");
    return;
    
    /* Original PDF generation code - temporarily commented out
    try {
      toast.info("Generating PDF... Please wait.");
      
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      
      const element = printRef.current;
      if (!element) return;

      // Hide buttons before capture
      const buttons = element.querySelectorAll('.no-print');
      buttons.forEach(btn => (btn as HTMLElement).style.display = 'none');

      // Create high-quality canvas
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200,
      });

      // Restore buttons
      buttons.forEach(btn => (btn as HTMLElement).style.display = '');

      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // A4 dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      const filename = `${student.firstName}_${student.lastName}_${result.term.replace(' ', '_')}_${result.academicYear.replace('/', '-')}.pdf`;
      pdf.save(filename);
      
      toast.success("PDF downloaded successfully!");
      
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error("Failed to generate PDF. Please try printing instead.");
    }
    */ // End of commented PDF code
  };

  const getPositionSuffix = (pos: number) => {
    if (pos === 1) return "st";
    if (pos === 2) return "nd";
    if (pos === 3) return "rd";
    return "th";
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 print:p-0 print:bg-white">
      {/* Action Buttons */}
      <div className="max-w-[210mm] mx-auto mb-4 flex gap-3 no-print print:hidden">
        <Button
          onClick={onClose}
          variant="outline"
          className="rounded-xl border-gray-300 text-gray-700"
        >
          <X className="w-4 h-4 mr-2" />
          Close
        </Button>
        <Button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Result
        </Button>
        <Button
          onClick={handleDownloadPDF}
          className="bg-green-600 hover:bg-green-700 text-white rounded-xl"
        >
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Result Sheet - Exact A4 Size */}
      <div
        ref={printRef}
        className="bg-white mx-auto shadow-lg print:shadow-none"
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "10mm",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {/* Header with Logo */}
        <div style={{ textAlign: "center", marginBottom: "8px", paddingBottom: "8px", borderBottom: "2px solid #000" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "6px" }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              border: "2px solid #10B981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#fff",
            }}>
              <div style={{
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                backgroundColor: "#10B981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: "20px",
                fontWeight: "bold",
              }}>
                GRA
              </div>
            </div>
          </div>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#10B981", marginBottom: "2px" }}>
            {schoolSettings?.schoolName || 'GRACELAND ROYAL ACADEMY'}
          </div>
          <div style={{ fontSize: "10px", fontWeight: "bold", marginBottom: "2px", color: "#000" }}>
            {schoolSettings?.schoolMotto || 'WISDOM & ILLUMINATION'}
          </div>
          <div style={{ fontSize: "9px", marginBottom: "2px", color: "#000" }}>
            {schoolSettings?.schoolAddress || 'BEHIND HAKIM PALACE OPPOSITE NNPC DEPOT TUNFURE, GOMBE'}
          </div>
          <div style={{ fontSize: "8px", color: "#666" }}>
            {schoolSettings?.schoolEmail || 'gracelandroyalacademy05@gmail.com'}
          </div>
        </div>

        {/* Student Info Section */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "10px", fontSize: "9px" }}>
          {/* Student Photo */}
          <div style={{ width: "80px", flexShrink: 0 }}>
            <div style={{
              width: "80px",
              height: "100px",
              border: "1px solid #000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f5f5f5",
            }}>
              {student.photoUrl ? (
                <img src={student.photoUrl} alt={student.firstName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ textAlign: "center", fontSize: "8px", color: "#999" }}>No Photo</div>
              )}
            </div>
          </div>

          {/* Student Details - Left Column */}
          <div style={{ flex: 1 }}>
            <table style={{ width: "100%", fontSize: "9px", borderCollapse: "collapse" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "2px 0" }}>
                    <strong>NAME:</strong> {student.firstName.toUpperCase()} {student.lastName.toUpperCase()}
                  </td>
                  <td style={{ padding: "2px 0" }}>
                    <strong>SESSION:</strong> {result.academicYear}
                  </td>
                  <td style={{ padding: "2px 0" }}>
                    <strong>NO. IN CLASS:</strong> {result.totalStudents}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "2px 0" }}>
                    <strong>ADM NO:</strong> {student.admissionNumber}
                  </td>
                  <td style={{ padding: "2px 0" }}>
                    <strong>TERM:</strong> {result.term.toUpperCase()}
                  </td>
                  <td style={{ padding: "2px 0" }}>
                    <strong>TERM END:</strong> {result.termEnd}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "2px 0" }}>
                    <strong>GENDER:</strong> {student.gender.toUpperCase()}
                  </td>
                  <td style={{ padding: "2px 0" }}>
                    <strong>CLASS:</strong> {classInfo.name}
                  </td>
                  <td style={{ padding: "2px 0" }}>
                    <strong>NEXT TERM BEGIN:</strong> {result.nextTermBegin}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "2px 0" }}>
                    <strong>DOB:</strong> {student.dateOfBirth}
                  </td>
                  <td style={{ padding: "2px 0", paddingRight: "10px" }} colSpan={2}>
                    <strong>NO. OF TIMES PRESENT:</strong> {result.timesPresent}/{result.totalAttendanceDays}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Grading Scale */}
        <div style={{ marginTop: "8px", fontSize: "8px" }}>
          <div style={{ fontWeight: "bold", marginBottom: "2px" }}>GRADING SCALE</div>
          <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>GRADE</th>
                <th style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>SCORE RANGE</th>
                <th style={{ border: "1px solid #000", padding: "3px", textAlign: "left" }}>REMARK</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>A</td>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>70 - 100</td>
                <td style={{ border: "1px solid #000", padding: "3px" }}>Excellent</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>B</td>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>60 - 69</td>
                <td style={{ border: "1px solid #000", padding: "3px" }}>Very Good</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>C</td>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>50 - 59</td>
                <td style={{ border: "1px solid #000", padding: "3px" }}>Good</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>D</td>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>45 - 49</td>
                <td style={{ border: "1px solid #000", padding: "3px" }}>Fair</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>E</td>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>40 - 44</td>
                <td style={{ border: "1px solid #000", padding: "3px" }}>Poor</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>F</td>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>0 - 39</td>
                <td style={{ border: "1px solid #000", padding: "3px" }}>Very Poor</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Result Sheet Title */}
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <strong style={{ fontSize: "11px", textDecoration: "underline" }}>
            {result.term.toUpperCase()} TERM RESULT SHEET
          </strong>
        </div>

        {/* Main Results Table */}
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          border: "1px solid #000",
          fontSize: "8px",
          marginBottom: "8px",
        }}>
          <thead>
            <tr>
              <th rowSpan={2} style={{ border: "1px solid #000", padding: "3px", textAlign: "center", backgroundColor: "#f5f5f5" }}>
                S/N
              </th>
              <th rowSpan={2} style={{ border: "1px solid #000", padding: "3px", textAlign: "left", backgroundColor: "#f5f5f5" }}>
                SUBJECT
              </th>
              <th style={{ border: "1px solid #000", padding: "3px", textAlign: "center", backgroundColor: "#f5f5f5" }}>
                1st CA
              </th>
              <th style={{ border: "1px solid #000", padding: "3px", textAlign: "center", backgroundColor: "#f5f5f5" }}>
                2nd CA
              </th>
              <th style={{ border: "1px solid #000", padding: "3px", textAlign: "center", backgroundColor: "#f5f5f5" }}>
                Exams
              </th>
              <th rowSpan={2} style={{ border: "1px solid #000", padding: "3px", textAlign: "center", backgroundColor: "#f5f5f5" }}>
                TOTAL
              </th>
              <th rowSpan={2} style={{ border: "1px solid #000", padding: "3px", textAlign: "center", backgroundColor: "#f5f5f5" }}>
                CLASS AVG
              </th>
              <th rowSpan={2} style={{ border: "1px solid #000", padding: "3px", textAlign: "center", backgroundColor: "#f5f5f5" }}>
                GRADE
              </th>
              <th rowSpan={2} style={{ border: "1px solid #000", padding: "3px", textAlign: "center", backgroundColor: "#f5f5f5" }}>
                REMARK
              </th>
              <th rowSpan={2} style={{ border: "1px solid #000", padding: "3px", textAlign: "center", backgroundColor: "#f5f5f5" }}>
                CLASS MIN
              </th>
              <th rowSpan={2} style={{ border: "1px solid #000", padding: "3px", textAlign: "center", backgroundColor: "#f5f5f5" }}>
                CLASS MAX
              </th>
              <th rowSpan={2} style={{ border: "1px solid #000", padding: "3px", textAlign: "left", backgroundColor: "#f5f5f5" }}>
                SUBJECT<br/>TEACHERS
              </th>
            </tr>
            <tr>
              <th style={{ border: "1px solid #000", padding: "3px", textAlign: "center", backgroundColor: "#f5f5f5" }}>20</th>
              <th style={{ border: "1px solid #000", padding: "3px", textAlign: "center", backgroundColor: "#f5f5f5" }}>20</th>
              <th style={{ border: "1px solid #000", padding: "3px", textAlign: "center", backgroundColor: "#f5f5f5" }}>60</th>
            </tr>
          </thead>
          <tbody>
            {result.scores.map((score, index) => (
              <tr key={score.id}>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{index + 1}</td>
                <td style={{ border: "1px solid #000", padding: "3px", fontWeight: "600" }}>{score.subjectName.toUpperCase()}</td>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{score.ca1.toFixed(1)}</td>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{score.ca2.toFixed(1)}</td>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{score.exam.toFixed(1)}</td>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center", fontWeight: "600" }}>{score.total.toFixed(1)}</td>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{score.classAverage.toFixed(1)}</td>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center", fontWeight: "600" }}>{score.grade}</td>
                <td style={{ border: "1px solid #000", padding: "3px" }}>{score.remark}</td>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{score.classMin.toFixed(1)}</td>
                <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{score.classMax.toFixed(1)}</td>
                <td style={{ border: "1px solid #000", padding: "3px", textTransform: "uppercase" }}>{score.subjectTeacher}</td>
              </tr>
            ))}
            {/* Summary Row */}
            <tr style={{ backgroundColor: "#f5f5f5", fontWeight: "bold" }}>
              <td colSpan={5} style={{ border: "1px solid #000", padding: "3px" }}>
                TOTAL SCORE: <span style={{ marginLeft: "8px" }}>{result.totalScore.toFixed(2)}</span>
              </td>
              <td colSpan={3} style={{ border: "1px solid #000", padding: "3px" }}>
                STUDENT AVERAGE: <span style={{ marginLeft: "8px" }}>{result.averageScore.toFixed(2)}</span>
              </td>
              <td colSpan={2} style={{ border: "1px solid #000", padding: "3px" }}>
                CLASS AVERAGE: <span style={{ marginLeft: "8px" }}>{result.classAverage.toFixed(2)}</span>
              </td>
              <td colSpan={2} style={{ border: "1px solid #000", padding: "3px" }}>
                STUDENT POSITION: <span style={{ marginLeft: "8px" }}>{result.position}{getPositionSuffix(result.position)}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Comments Section */}
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          border: "1px solid #000",
          fontSize: "9px",
          marginBottom: "8px",
        }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #000", padding: "4px", width: "25%", fontWeight: "bold", backgroundColor: "#f5f5f5" }}>
                CLASS TEACHER
              </td>
              <td style={{ border: "1px solid #000", padding: "4px", textTransform: "uppercase" }} colSpan={3}>
                {result.classTeacherName}
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #000", padding: "4px", fontWeight: "bold", backgroundColor: "#f5f5f5" }}>
                CLASS TEACHER'S COMMENT
              </td>
              <td style={{ border: "1px solid #000", padding: "4px" }} colSpan={3}>
                {result.classTeacherComment}
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #000", padding: "4px", fontWeight: "bold", backgroundColor: "#f5f5f5" }}>
                PRINCIPAL
              </td>
              <td style={{ border: "1px solid #000", padding: "4px", textTransform: "uppercase" }} colSpan={3}>
                {result.principalName}
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #000", padding: "4px", fontWeight: "bold", backgroundColor: "#f5f5f5" }}>
                PRINCIPAL'S COMMENT
              </td>
              <td style={{ border: "1px solid #000", padding: "4px" }} colSpan={3}>
                {result.principalComment}
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #000", padding: "4px", fontWeight: "bold", backgroundColor: "#f5f5f5" }}>
                PRINCIPAL'S SIGNATURE
              </td>
              <td style={{ border: "1px solid #000", padding: "8px" }} colSpan={3}>
                {result.principalSignature && (
                  <img 
                    src={result.principalSignature} 
                    alt="Signature" 
                    style={{ height: "30px", objectFit: "contain" }}
                  />
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Affective & Psychomotor Section */}
        <div style={{ display: "flex", gap: "8px", fontSize: "8px" }}>
          {/* Affective Areas */}
          <div style={{ flex: 1 }}>
            <div style={{
              textAlign: "center",
              padding: "3px",
              fontWeight: "bold",
              border: "1px solid #000",
              backgroundColor: "#f5f5f5",
              marginBottom: "0",
            }}>
              AFFECTIVE AREAS
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000" }}>
              <thead>
                <tr style={{ backgroundColor: "#f5f5f5" }}>
                  <th style={{ border: "1px solid #000", padding: "3px", textAlign: "left", fontWeight: "bold" }}>
                    PERSONAL & SOCIAL QUALITIES
                  </th>
                  <th style={{ border: "1px solid #000", padding: "3px", textAlign: "center", fontWeight: "bold" }}>
                    SCORES
                  </th>
                  <th style={{ border: "1px solid #000", padding: "3px", textAlign: "left", fontWeight: "bold" }}>
                    REMARK
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.affective && (
                  <>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>ATTENTIVENESS</td>
                      <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{result.affective.attentiveness}</td>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>{result.affective.attentivenessRemark}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>HONESTY</td>
                      <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{result.affective.honesty}</td>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>{result.affective.honestyRemark}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>NEATNESS</td>
                      <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{result.affective.neatness}</td>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>{result.affective.neatnessRemark}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>OBEDIENCE</td>
                      <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{result.affective.obedience}</td>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>{result.affective.obedienceRemark}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>SENSE OF RESPONSIBILITY</td>
                      <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{result.affective.senseOfResponsibility}</td>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>{result.affective.senseOfResponsibilityRemark}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Psychomotor Skills */}
          <div style={{ flex: 1 }}>
            <div style={{
              textAlign: "center",
              padding: "3px",
              fontWeight: "bold",
              border: "1px solid #000",
              backgroundColor: "#f5f5f5",
              marginBottom: "0",
            }}>
              PSYCHOMOTOR SKILLS
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #000" }}>
              <thead>
                <tr style={{ backgroundColor: "#f5f5f5" }}>
                  <th style={{ border: "1px solid #000", padding: "3px", textAlign: "left", fontWeight: "bold" }}>
                    PERSONAL & SOCIAL QUALITIES
                  </th>
                  <th style={{ border: "1px solid #000", padding: "3px", textAlign: "center", fontWeight: "bold" }}>
                    SCORES
                  </th>
                  <th style={{ border: "1px solid #000", padding: "3px", textAlign: "left", fontWeight: "bold" }}>
                    REMARK
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.psychomotor && (
                  <>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>ATTENTION TO DIRECTION</td>
                      <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{result.psychomotor.attentionToDirection}</td>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>{result.psychomotor.attentionToDirectionRemark}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>CONSIDERATE OF OTHERS</td>
                      <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{result.psychomotor.considerateOfOthers}</td>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>{result.psychomotor.considerateOfOthersRemark}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>HANDWRITING</td>
                      <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{result.psychomotor.handwriting}</td>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>{result.psychomotor.handwritingRemark}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>SPORTS</td>
                      <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{result.psychomotor.sports}</td>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>{result.psychomotor.sportsRemark}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>VERBAL FLUENCY</td>
                      <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{result.psychomotor.verbalFluency}</td>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>{result.psychomotor.verbalFluencyRemark}</td>
                    </tr>
                    <tr>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>WORKS WELL INDEPENDENTLY</td>
                      <td style={{ border: "1px solid #000", padding: "3px", textAlign: "center" }}>{result.psychomotor.worksWellIndependently}</td>
                      <td style={{ border: "1px solid #000", padding: "3px" }}>{result.psychomotor.worksWellIndependentlyRemark}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
