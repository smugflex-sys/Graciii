import { School, Download } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { toast } from "sonner";

interface ResultReportCardProps {
  onClose: () => void;
  studentData?: {
    name: string;
    admissionNumber: string;
    class: string;
    term: string;
    session: string;
    totalStudents: number;
    position: string;
    averageScore: number;
    attendance: {
      totalDays: number;
      present: number;
      percentage: number;
    };
  };
  results?: Array<{
    subject: string;
    test1: number;
    test2: number;
    exam: number;
    total: number;
    grade: string;
    position: string;
  }>;
}

export function ResultReportCard({ onClose, studentData, results }: ResultReportCardProps) {
  // Default data if not provided (for development/testing)
  const defaultStudentData = {
    name: "ABDULMAJID IBRAHIM",
    admissionNumber: "GRA/JSS1/001",
    class: "JSS 1A",
    term: "First Term",
    session: "2023/2024",
    totalStudents: 25,
    position: "3rd",
    averageScore: 82.3,
    attendance: {
      totalDays: 60,
      present: 58,
      percentage: 96.7
    }
  };

  const defaultResults = [
    { subject: "Mathematics", test1: 18, test2: 17, exam: 50, total: 85, grade: "A", position: "3rd" },
    { subject: "English Language", test1: 16, test2: 15, exam: 47, total: 78, grade: "B", position: "7th" },
    { subject: "Basic Science", test1: 17, test2: 18, exam: 47, total: 82, grade: "A", position: "4th" },
    { subject: "Social Studies", test1: 15, test2: 16, exam: 45, total: 76, grade: "B", position: "8th" },
    { subject: "Computer Studies", test1: 19, test2: 18, exam: 51, total: 88, grade: "A", position: "2nd" },
    { subject: "Basic Technology", test1: 16, test2: 17, exam: 48, total: 81, grade: "A", position: "5th" },
    { subject: "Home Economics", test1: 18, test2: 17, exam: 49, total: 84, grade: "A", position: "3rd" },
    { subject: "Civic Education", test1: 17, test2: 16, exam: 46, total: 79, grade: "B", position: "6th" },
    { subject: "Physical & Health Ed.", test1: 18, test2: 19, exam: 52, total: 89, grade: "A+", position: "1st" },
    { subject: "CRS/IRS", test1: 16, test2: 17, exam: 47, total: 80, grade: "A", position: "5th" },
  ];

  const student = studentData || defaultStudentData;
  const subjectResults = results || defaultResults;
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <Button
            onClick={onClose}
            variant="outline"
            className="rounded-xl border-2 border-[#0A2540] text-[#0A2540] hover:bg-[#0A2540] hover:text-white shadow-md"
          >
            ← Back
          </Button>
          <Button
            onClick={() => toast.info("Downloading PDF report...")}
            className="bg-[#FFD700] text-[#0A2540] hover:bg-[#FFD700]/90 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>

        <Card className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Report Header */}
          <div className="bg-gradient-to-r from-[#0A2540] to-[#0d3558] text-white p-8 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xl">
                <School className="w-10 h-10 text-[#0A2540]" />
              </div>
            </div>
            <h1 className="text-3xl mb-2 text-white">Graceland Royal Academy Gombe</h1>
            <p className="text-[#FFD700] italic text-lg">"Wisdom & Illumination"</p>
            <p className="text-white/80 text-sm mt-2">P.O. Box XXX, Gombe State, Nigeria</p>
            <div className="mt-4 inline-block px-6 py-2 bg-white/10 rounded-full backdrop-blur-sm">
              <p className="text-sm text-white">Terminal Report - Second Term 2024/2025</p>
            </div>
          </div>

          <div className="p-8">
            {/* Student Information */}
            <div className="flex items-start gap-6 mb-6 pb-6 border-b-2 border-gray-200">
              <div className="w-24 h-24 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
                <ImageWithFallback
                  src=""
                  alt="Student"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4 flex-1">
                <div>
                  <p className="text-sm text-gray-600">Student Name</p>
                  <p className="text-[#0A2540]">{student.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Student ID</p>
                  <p className="text-[#0A2540]">{student.admissionNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Class</p>
                  <p className="text-[#0A2540]">{student.class}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Session</p>
                  <p className="text-[#0A2540]">{student.session}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Term</p>
                  <p className="text-[#0A2540]">{student.term}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Number in Class</p>
                  <p className="text-[#0A2540]">{student.totalStudents}</p>
                </div>
              </div>
            </div>

            {/* Academic Performance */}
            <div className="mb-6">
              <h3 className="text-lg text-[#0A2540] mb-4">Academic Performance</h3>
              <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#0A2540] text-white">
                    <tr>
                      <th className="p-3 text-left">Subject</th>
                      <th className="p-3 text-center">1st Test</th>
                      <th className="p-3 text-center">2nd Test</th>
                      <th className="p-3 text-center">Exam</th>
                      <th className="p-3 text-center">Total</th>
                      <th className="p-3 text-center">Grade</th>
                      <th className="p-3 text-center">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectResults.map((result, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                        <td className="p-3">{result.subject}</td>
                        <td className="p-3 text-center">{result.test1}</td>
                        <td className="p-3 text-center">{result.test2}</td>
                        <td className="p-3 text-center">{result.exam}</td>
                        <td className="p-3 text-center">{result.total}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2 py-1 rounded ${
                            result.grade.includes("A") ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                          }`}>
                            {result.grade}
                          </span>
                        </td>
                        <td className="p-3 text-center">{result.position}</td>
                      </tr>
                    ))}
                    <tr className="bg-[#0A2540] text-white">
                      <td className="p-3" colSpan={4}>Total Score</td>
                      <td className="p-3 text-center">822/1000</td>
                      <td className="p-3 text-center" colSpan={2}>Average: {student.averageScore}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-[#FFD700]/10 border-2 border-[#FFD700] rounded-xl text-center">
                <p className="text-sm text-gray-600 mb-1">Overall Position</p>
                <p className="text-2xl text-[#0A2540]">{student.position}/{student.totalStudents}</p>
              </div>
              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl text-center">
                <p className="text-sm text-gray-600 mb-1">Grade</p>
                <p className="text-2xl text-green-700">A</p>
              </div>
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl text-center">
                <p className="text-sm text-gray-600 mb-1">Percentage</p>
                <p className="text-2xl text-blue-700">{student.averageScore}%</p>
              </div>
            </div>

            {/* Affective and Psychomotor Assessment */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg text-[#0A2540] mb-3">Affective Domain</h3>
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {[
                        { trait: "Punctuality", rating: 5 },
                        { trait: "Neatness", rating: 5 },
                        { trait: "Politeness", rating: 4 },
                        { trait: "Honesty", rating: 5 },
                        { trait: "Relationship with Others", rating: 4 },
                      ].map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                          <td className="p-3">{item.trait}</td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <div
                                  key={star}
                                  className={`w-4 h-4 rounded-full ${
                                    star <= item.rating ? "bg-[#FFD700]" : "bg-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-lg text-[#0A2540] mb-3">Psychomotor Domain</h3>
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {[
                        { skill: "Handwriting", rating: 4 },
                        { skill: "Sports & Games", rating: 5 },
                        { skill: "Handling of Tools", rating: 4 },
                        { skill: "Drawing & Painting", rating: 4 },
                        { skill: "Musical Skills", rating: 3 },
                      ].map((item, index) => (
                        <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                          <td className="p-3">{item.skill}</td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <div
                                  key={star}
                                  className={`w-4 h-4 rounded-full ${
                                    star <= item.rating ? "bg-[#FFD700]" : "bg-gray-300"
                                  }`}
                                />
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Class Teacher's Comment</p>
                <p className="text-[#0A2540]">
                  Fatima has shown excellent performance throughout the term. She is dedicated, hardworking, 
                  and participates actively in class. Keep up the outstanding work!
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-600 mb-1">Principal's Comment</p>
                <p className="text-[#0A2540]">
                  An impressive academic record. Well done! Continue to strive for excellence.
                </p>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid md:grid-cols-3 gap-6 pt-6 border-t-2 border-gray-200">
              <div className="text-center">
                <div className="h-16 mb-2 border-b-2 border-gray-300" />
                <p className="text-sm text-gray-600">Class Teacher's Signature</p>
              </div>
              <div className="text-center">
                <div className="h-16 mb-2 border-b-2 border-gray-300" />
                <p className="text-sm text-gray-600">Principal's Signature</p>
              </div>
              <div className="text-center">
                <div className="h-16 mb-2 border-b-2 border-gray-300" />
                <p className="text-sm text-gray-600">Parent's Signature</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t-2 border-gray-200 text-center">
              <p className="text-sm text-gray-500">
                Powered by Graceland Royal Academy Gombe – Wisdom & Illumination
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Next Term Begins: September 15, 2025
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
