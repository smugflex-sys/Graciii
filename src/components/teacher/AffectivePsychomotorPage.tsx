import { useState, useMemo } from "react";
import { Heart, Brain, Save, CheckCircle, AlertCircle, Edit, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { useSchool } from "../../contexts/SchoolContext";
import { toast } from "sonner";


export function AffectivePsychomotorPage() {
  const {
    currentUser,
    teachers,
    students,
    classes,
    affectiveDomains,
    psychomotorDomains,
    addAffectiveDomain,
    updateAffectiveDomain,
    addPsychomotorDomain,
    updatePsychomotorDomain,
    currentTerm,
    currentAcademicYear,
    loadingSessionTerm,
    sessionTermError
  } = useSchool();

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'affective' | 'psychomotor'>('affective');

  // Affective domain ratings
  const [affectiveRatings, setAffectiveRatings] = useState({
    attentiveness: { value: 0, remark: '' },
    honesty: { value: 0, remark: '' },
    neatness: { value: 0, remark: '' },
    obedience: { value: 0, remark: '' },
    senseOfResponsibility: { value: 0, remark: '' }
  });

  // Psychomotor domain ratings
  const [psychomotorRatings, setPsychomotorRatings] = useState({
    attentionToDirection: { value: 0, remark: '' },
    considerateOfOthers: { value: 0, remark: '' },
    handwriting: { value: 0, remark: '' },
    sports: { value: 0, remark: '' },
    verbalFluency: { value: 0, remark: '' },
    worksWellIndependently: { value: 0, remark: '' }
  });

  // Get current teacher
  const currentTeacher = currentUser ? teachers.find(t => t.id === currentUser.linkedId) : null;
  const isClassTeacher = currentTeacher?.isClassTeacher || false;

  // Get classes where this teacher is class teacher
  const classTeacherClasses = useMemo(() => {
    if (!currentTeacher) return [];
    return classes.filter(c => c.classTeacherId === currentTeacher.id && c.status?.toLowerCase() === 'active');
  }, [currentTeacher, classes]);

  // Get students in selected class - use class students if available, otherwise fall back to global students
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    
    // First try to get students from the class data (if available)
    const selectedClass = classes.find(c => c.id === Number(selectedClassId));
    if (selectedClass?.students && selectedClass.students.length > 0) {
      return selectedClass.students
        .filter(s => s.status?.toLowerCase() === 'active')
        .sort((a, b) => a.lastName.localeCompare(b.lastName));
    }
    
    // Fall back to global students data
    return students
      .filter(s => s.classId === Number(selectedClassId) && s.status?.toLowerCase() === 'active')
      .sort((a, b) => a.lastName.localeCompare(b.lastName));
  }, [selectedClassId, students, classes]);

  // Get rating label
  const getRatingLabel = (value: number): string => {
    if (value === 5) return 'Excellent';
    if (value === 4) return 'Very Good';
    if (value === 3) return 'Good';
    if (value === 2) return 'Fair';
    if (value === 1) return 'Poor';
    return 'Not Rated';
  };

  // Get rating color
  const getRatingColor = (value: number): string => {
    if (value === 5) return 'bg-[#10B981]';
    if (value === 4) return 'bg-[#3B82F6]';
    if (value === 3) return 'bg-[#F59E0B]';
    if (value === 2) return 'bg-[#F97316]';
    if (value === 1) return 'bg-[#EF4444]';
    return 'bg-[#9CA3AF]';
  };

  // Open modal for student
  const openModal = (studentId: number) => {
    setSelectedStudentId(studentId);
    
    // Load existing data
    const existingAffective = affectiveDomains.find(a =>
      a.studentId === studentId &&
      a.classId === Number(selectedClassId) &&
      a.term === currentTerm &&
      a.academicYear === currentAcademicYear
    );

    const existingPsychomotor = psychomotorDomains.find(p =>
      p.studentId === studentId &&
      p.classId === Number(selectedClassId) &&
      p.term === currentTerm &&
      p.academicYear === currentAcademicYear
    );

    if (existingAffective) {
      setAffectiveRatings({
        attentiveness: { value: existingAffective.attentiveness, remark: existingAffective.attentivenessRemark },
        honesty: { value: existingAffective.honesty, remark: existingAffective.honestyRemark },
        neatness: { value: existingAffective.neatness, remark: existingAffective.neatnessRemark },
        obedience: { value: existingAffective.obedience, remark: existingAffective.obedienceRemark },
        senseOfResponsibility: { value: existingAffective.senseOfResponsibility, remark: existingAffective.senseOfResponsibilityRemark }
      });
    } else {
      setAffectiveRatings({
        attentiveness: { value: 0, remark: '' },
        honesty: { value: 0, remark: '' },
        neatness: { value: 0, remark: '' },
        obedience: { value: 0, remark: '' },
        senseOfResponsibility: { value: 0, remark: '' }
      });
    }

    if (existingPsychomotor) {
      setPsychomotorRatings({
        attentionToDirection: { value: existingPsychomotor.attentionToDirection, remark: existingPsychomotor.attentionToDirectionRemark },
        considerateOfOthers: { value: existingPsychomotor.considerateOfOthers, remark: existingPsychomotor.considerateOfOthersRemark },
        handwriting: { value: existingPsychomotor.handwriting, remark: existingPsychomotor.handwritingRemark },
        sports: { value: existingPsychomotor.sports, remark: existingPsychomotor.sportsRemark },
        verbalFluency: { value: existingPsychomotor.verbalFluency, remark: existingPsychomotor.verbalFluencyRemark },
        worksWellIndependently: { value: existingPsychomotor.worksWellIndependently, remark: existingPsychomotor.worksWellIndependentlyRemark }
      });
    } else {
      setPsychomotorRatings({
        attentionToDirection: { value: 0, remark: '' },
        considerateOfOthers: { value: 0, remark: '' },
        handwriting: { value: 0, remark: '' },
        sports: { value: 0, remark: '' },
        verbalFluency: { value: 0, remark: '' },
        worksWellIndependently: { value: 0, remark: '' }
      });
    }

    setShowModal(true);
  };

  // Save assessments
  const handleSave = () => {
    if (!selectedStudentId || !currentTeacher) return;

    // Check if all ratings are provided
    const affectiveComplete = Object.values(affectiveRatings).every(r => r.value > 0);
    const psychomotorComplete = Object.values(psychomotorRatings).every(r => r.value > 0);

    if (!affectiveComplete || !psychomotorComplete) {
      toast.error("Please provide ratings for all traits");
      return;
    }

    const existingAffective = affectiveDomains.find(a =>
      a.studentId === selectedStudentId &&
      a.classId === Number(selectedClassId) &&
      a.term === currentTerm &&
      a.academicYear === currentAcademicYear
    );

    const existingPsychomotor = psychomotorDomains.find(p =>
      p.studentId === selectedStudentId &&
      p.classId === Number(selectedClassId) &&
      p.term === currentTerm &&
      p.academicYear === currentAcademicYear
    );

    // Save affective
    const affectiveData = {
      studentId: selectedStudentId!,
      classId: Number(selectedClassId),
      term: currentTerm,
      academicYear: currentAcademicYear,
      enteredBy: currentTeacher.id,
      attentiveness: affectiveRatings.attentiveness.value,
      attentivenessRemark: affectiveRatings.attentiveness.remark,
      honesty: affectiveRatings.honesty.value,
      honestyRemark: affectiveRatings.honesty.remark,
      neatness: affectiveRatings.neatness.value,
      neatnessRemark: affectiveRatings.neatness.remark,
      obedience: affectiveRatings.obedience.value,
      obedienceRemark: affectiveRatings.obedience.remark,
      senseOfResponsibility: affectiveRatings.senseOfResponsibility.value,
      senseOfResponsibilityRemark: affectiveRatings.senseOfResponsibility.remark,
      enteredDate: new Date().toISOString().split('T')[0]
    };

    // Save psychomotor
    const psychomotorData = {
      studentId: selectedStudentId!,
      classId: Number(selectedClassId),
      term: currentTerm,
      academicYear: currentAcademicYear,
      enteredBy: currentTeacher.id,
      attentionToDirection: psychomotorRatings.attentionToDirection.value,
      attentionToDirectionRemark: psychomotorRatings.attentionToDirection.remark || getRatingLabel(psychomotorRatings.attentionToDirection.value),
      considerateOfOthers: psychomotorRatings.considerateOfOthers.value,
      considerateOfOthersRemark: psychomotorRatings.considerateOfOthers.remark || getRatingLabel(psychomotorRatings.considerateOfOthers.value),
      handwriting: psychomotorRatings.handwriting.value,
      handwritingRemark: psychomotorRatings.handwriting.remark || getRatingLabel(psychomotorRatings.handwriting.value),
      sports: psychomotorRatings.sports.value,
      sportsRemark: psychomotorRatings.sports.remark || getRatingLabel(psychomotorRatings.sports.value),
      verbalFluency: psychomotorRatings.verbalFluency.value,
      verbalFluencyRemark: psychomotorRatings.verbalFluency.remark || getRatingLabel(psychomotorRatings.verbalFluency.value),
      worksWellIndependently: psychomotorRatings.worksWellIndependently.value,
      worksWellIndependentlyRemark: psychomotorRatings.worksWellIndependently.remark || getRatingLabel(psychomotorRatings.worksWellIndependently.value),
      enteredDate: new Date().toISOString().split('T')[0]
    };

    if (existingAffective) {
      updateAffectiveDomain(existingAffective.id, affectiveData);
    } else {
      addAffectiveDomain(affectiveData);
    }

    if (existingPsychomotor) {
      updatePsychomotorDomain(existingPsychomotor.id, psychomotorData);
    } else {
      addPsychomotorDomain(psychomotorData);
    }

    const student = classStudents.find(s => s.id === selectedStudentId);
    toast.success(`Assessments saved for ${student?.firstName} ${student?.lastName}`);
    setShowModal(false);
  };

  // Check if student has complete assessments
  const hasCompleteAssessments = (studentId: number): boolean => {
    const affective = affectiveDomains.find(a =>
      a.studentId === studentId &&
      a.classId === Number(selectedClassId) &&
      a.term === currentTerm &&
      a.academicYear === currentAcademicYear
    );

    const psychomotor = psychomotorDomains.find(p =>
      p.studentId === studentId &&
      p.classId === Number(selectedClassId) &&
      p.term === currentTerm &&
      p.academicYear === currentAcademicYear
    );

    return affective !== undefined && psychomotor !== undefined;
  };

  // Show loading state while session/term data is loading
  if (loadingSessionTerm) {
    return (
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading academic session information...</p>
        </CardContent>
      </Card>
    );
  }

  // Show error state if session/term data loading failed
  if (sessionTermError) {
    return (
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardContent className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Session Information Required</h3>
          <p className="text-gray-600 mb-4">{sessionTermError}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isClassTeacher) {
    return (
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardContent className="p-12 text-center">
          <Lock className="w-12 h-12 text-[#9CA3AF] mx-auto mb-4" />
          <h3 className="text-[#1F2937] mb-2">Class Teacher Only</h3>
          <p className="text-[#6B7280]">
            This feature is only available to Class Teachers. Please contact the administrator if you believe you should have access.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-[#1F2937] mb-2">Affective & Psychomotor Assessment</h1>
        <p className="text-[#6B7280]">Evaluate students' behavioral and physical development</p>
      </div>

      {/* Class Selection */}
      <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
        <CardHeader className="p-6 border-b border-[#E5E7EB]">
          <CardTitle className="text-[#1F2937]">Select Class</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="max-w-md">
            <Label className="text-[#1F2937] mb-2 block">Class</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="rounded-lg border-[#E5E7EB] focus:border-[#2563EB]">
                <SelectValue placeholder="Select your class" />
              </SelectTrigger>
              <SelectContent>
                {classTeacherClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id.toString()}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      {selectedClassId && classStudents.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] text-white border-0 shadow-clinical">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Heart className="w-6 h-6" />
                </div>
              </div>
              <p className="text-white/80 text-sm mb-1">Total Students</p>
              <h3 className="text-white">{classStudents.length}</h3>
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] text-white border-0 shadow-clinical">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
              <p className="text-white/80 text-sm mb-1">Completed</p>
              <h3 className="text-white">
                {classStudents.filter(s => hasCompleteAssessments(s.id)).length}
              </h3>
            </CardContent>
          </Card>

          <Card className="rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#F4B400] text-white border-0 shadow-clinical">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
              </div>
              <p className="text-white/80 text-sm mb-1">Pending</p>
              <h3 className="text-white">
                {classStudents.filter(s => !hasCompleteAssessments(s.id)).length}
              </h3>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Student List */}
      {selectedClassId && classStudents.length > 0 && (
        <Card className="rounded-xl bg-white border border-[#E5E7EB] shadow-clinical">
          <CardHeader className="p-6 border-b border-[#E5E7EB]">
            <CardTitle className="text-[#1F2937]">Students ({classStudents.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#2563EB] text-white">
                    <th className="text-left p-4">#</th>
                    <th className="text-left p-4">Student Name</th>
                    <th className="text-left p-4">Admission Number</th>
                    <th className="text-center p-4">Status</th>
                    <th className="text-center p-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((student, index) => {
                    const isComplete = hasCompleteAssessments(student.id);
                    return (
                      <tr key={student.id} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                        <td className="p-4 text-[#6B7280]">{index + 1}</td>
                        <td className="p-4 text-[#1F2937]">
                          {student.firstName} {student.lastName}
                        </td>
                        <td className="p-4 text-[#6B7280]">{student.admissionNumber}</td>
                        <td className="p-4 text-center">
                          {isComplete ? (
                            <Badge className="bg-[#10B981] text-white rounded-full">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Complete
                            </Badge>
                          ) : (
                            <Badge className="bg-[#F59E0B] text-white rounded-full">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <Button
                            onClick={() => openModal(student.id)}
                            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg shadow-clinical"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {isComplete ? 'Edit' : 'Add'} Assessment
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessment Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedStudentId && classStudents.find(s => s.id === selectedStudentId) && (
                <>
                  Assessment for {classStudents.find(s => s.id === selectedStudentId)?.firstName}{' '}
                  {classStudents.find(s => s.id === selectedStudentId)?.lastName}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-[#E5E7EB]">
            <button
              onClick={() => setActiveTab('affective')}
              className={`px-4 py-2 rounded-t-lg transition-all ${
                activeTab === 'affective'
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]'
              }`}
            >
              <Heart className="w-4 h-4 inline mr-2" />
              Affective Domain
            </button>
            <button
              onClick={() => setActiveTab('psychomotor')}
              className={`px-4 py-2 rounded-t-lg transition-all ${
                activeTab === 'psychomotor'
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#E5E7EB]'
              }`}
            >
              <Brain className="w-4 h-4 inline mr-2" />
              Psychomotor Domain
            </button>
          </div>

          {/* Affective Tab */}
          {activeTab === 'affective' && (
            <div className="space-y-4 mt-4">
              {Object.entries(affectiveRatings).map(([key, rating]) => (
                <div key={key} className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                  <Label className="text-[#1F2937] mb-3 block capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[#6B7280] text-sm mb-2 block">Rating (1-5)</Label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            onClick={() => setAffectiveRatings(prev => ({
                              ...prev,
                              [key]: { ...prev[key as keyof typeof affectiveRatings], value }
                            }))}
                            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
                              rating.value === value
                                ? `${getRatingColor(value)} text-white shadow-clinical`
                                : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#2563EB]'
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      {rating.value > 0 && (
                        <p className="text-sm text-[#6B7280] mt-2">
                          {getRatingLabel(rating.value)}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-[#6B7280] text-sm mb-2 block">Remark (Optional)</Label>
                      <Input
                        value={rating.remark}
                        onChange={(e) => setAffectiveRatings(prev => ({
                          ...prev,
                          [key]: { ...prev[key as keyof typeof affectiveRatings], remark: e.target.value }
                        }))}
                        placeholder={getRatingLabel(rating.value)}
                        className="rounded-lg border-[#E5E7EB] focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Psychomotor Tab */}
          {activeTab === 'psychomotor' && (
            <div className="space-y-4 mt-4">
              {Object.entries(psychomotorRatings).map(([key, rating]) => (
                <div key={key} className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                  <Label className="text-[#1F2937] mb-3 block capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-[#6B7280] text-sm mb-2 block">Rating (1-5)</Label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            key={value}
                            onClick={() => setPsychomotorRatings(prev => ({
                              ...prev,
                              [key]: { ...prev[key as keyof typeof psychomotorRatings], value }
                            }))}
                            className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
                              rating.value === value
                                ? `${getRatingColor(value)} text-white shadow-clinical`
                                : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#2563EB]'
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                      {rating.value > 0 && (
                        <p className="text-sm text-[#6B7280] mt-2">
                          {getRatingLabel(rating.value)}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label className="text-[#6B7280] text-sm mb-2 block">Remark (Optional)</Label>
                      <Input
                        value={rating.remark}
                        onChange={(e) => setPsychomotorRatings(prev => ({
                          ...prev,
                          [key]: { ...prev[key as keyof typeof psychomotorRatings], remark: e.target.value }
                        }))}
                        placeholder={getRatingLabel(rating.value)}
                        className="rounded-lg border-[#E5E7EB] focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#E5E7EB]">
            <Button
              onClick={() => setShowModal(false)}
              variant="outline"
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-[#10B981] hover:bg-[#059669] text-white rounded-lg shadow-clinical"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Assessment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instructions */}
      <Card className="rounded-xl bg-gradient-to-r from-[#3B82F6]/10 to-[#3B82F6]/5 border border-[#3B82F6]/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#3B82F6] mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm text-[#1F2937]">
              <p><strong>Assessment Guidelines:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-[#6B7280]">
                <li><strong>Rating Scale:</strong> 1 (Poor), 2 (Fair), 3 (Good), 4 (Very Good), 5 (Excellent)</li>
                <li><strong>Affective Domain:</strong> Behavioral traits including attentiveness, honesty, neatness, obedience, and sense of responsibility</li>
                <li><strong>Psychomotor Domain:</strong> Physical and cognitive skills including attention to direction, handwriting, sports ability, and verbal fluency</li>
                <li>You can optionally add custom remarks for each trait</li>
                <li>Both affective and psychomotor assessments must be completed before results can be compiled</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
