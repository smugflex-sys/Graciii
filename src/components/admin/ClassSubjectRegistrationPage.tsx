import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, BookOpen, Calendar, Users, Check, AlertCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { useSchool } from '../../contexts/SchoolContext';
import { useAcademicData } from '../../hooks/useAcademicData';

interface ClassSubjectRegistration {
  id: number;
  classId: number;
  className: string;
  subjectId: number;
  subjectName: string;
  subjectCode: string;
  term: string;
  academicYear: string;
  isCore: boolean;
  status: 'Active' | 'Inactive';
  registeredBy: string;
  registeredDate: string;
}

export function ClassSubjectRegistrationPage() {
  const {
    classes,
    subjects,
    subjectAssignments,
    currentUser,
    addClassSubjectRegistration,
    deleteClassSubjectRegistration,
    fetchClassSubjectRegistrations,
  } = useSchool();

  const { terms, sessions, loading: academicLoading } = useAcademicData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('All');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [registrations, setRegistrations] = useState<ClassSubjectRegistration[]>([]);

  // Set initial filter values when academic data loads
  useEffect(() => {
    if (!academicLoading) {
      const activeTerm = terms.find(t => t.isActive);
      const activeSession = sessions.find(s => s.isActive);
      setFilterTerm(activeTerm?.name || '');
      setFilterYear(activeSession?.name || '');
    }
  }, [terms, sessions, academicLoading]);

  const loadRegistrations = async () => {
    try {
      const data = await fetchClassSubjectRegistrations({
        term: filterTerm,
        academicYear: filterYear,
      });
      setRegistrations(data);
    } catch (error) {
      console.error('Error loading registrations:', error);
      toast.error('Failed to load subject registrations');
    }
  };

  // Filter registrations
  const filteredRegistrations = registrations.filter((reg) => {
    const matchesSearch =
      reg.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.subjectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.subjectCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = filterClass === 'All' || reg.classId === parseInt(filterClass);
    return matchesSearch && matchesClass;
  });

  // Get available subjects for a class (exclude already registered ones for current term/year)
  const getAvailableSubjects = (classId: number) => {
    const alreadyRegistered = registrations
      .filter(reg => reg.classId === classId && reg.term === filterTerm && reg.academicYear === filterYear)
      .map(reg => reg.subjectId);
    
    return subjects.filter(subject => !alreadyRegistered.includes(subject.id));
  };

  const handleOpenRegisterDialog = () => {
    setSelectedClassId(null);
    setSelectedSubjects([]);
    setIsRegisterDialogOpen(true);
  };

  const handleRegisterSubjects = async () => {
    if (!selectedClassId || selectedSubjects.length === 0) {
      toast.error('Please select a class and at least one subject');
      return;
    }

    try {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      if (!selectedClass) return;

      // Register each selected subject
      const promises = selectedSubjects.map(subjectId => {
        const subject = subjects.find(s => s.id === subjectId);
        if (!subject) return null;

        return addClassSubjectRegistration({
          classId: selectedClassId,
          subjectId: subjectId,
          className: selectedClass.name, // Add missing className
          subjectName: subject.name, // Add missing subjectName
          subjectCode: subject.code, // Add missing subjectCode
          term: filterTerm || 'First Term', // Use selected term
          academicYear: filterYear || '2024/2025', // Use selected session
          isCore: subject.isCore || false,
          status: 'Active', // Add missing status
          registeredBy: (currentUser as any)?.firstName || 'Admin', // Safe property access
        });
      });

      await Promise.all(promises.filter(Boolean));

      toast.success(`Successfully registered ${selectedSubjects.length} subject(s) for ${selectedClass.name}`);
      setIsRegisterDialogOpen(false);
      setSelectedClassId(null);
      setSelectedSubjects([]);
      loadRegistrations();
    } catch (error) {
      console.error('Error registering subjects:', error);
      toast.error('Failed to register subjects');
    }
  };

  const handleRemoveRegistration = async (id: number) => {
    try {
      await deleteClassSubjectRegistration(id);
      toast.success('Subject registration removed successfully');
      loadRegistrations();
    } catch (error) {
      console.error('Error removing registration:', error);
      toast.error('Failed to remove subject registration');
    }
  };

  const handleSubjectToggle = (subjectId: number) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-white mb-2">Class Subject Registration</h1>
        <p className="text-[#C0C8D3]">Register subjects for each class per term and academic year</p>
      </div>

      {/* Current Session Info */}
      <Alert className="border-blue-200 bg-blue-50 rounded-xl">
        <Calendar className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>Current Registration Period:</strong> {filterTerm || 'Select Term'} - {filterYear || 'Select Session'}
          <br />
          <span className="text-sm text-blue-700">Register subjects for classes for the current term and academic year</span>
        </AlertDescription>
      </Alert>

      {/* Filters and Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by class or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl border-gray-300 bg-white"
            />
          </div>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="h-10 rounded-xl border-gray-300 bg-white min-w-40">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="All">All Classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id.toString()}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTerm} onValueChange={setFilterTerm} disabled={academicLoading}>
            <SelectTrigger className="h-10 rounded-xl border-gray-300 bg-white min-w-32">
              <SelectValue placeholder={academicLoading ? "Loading..." : "Select Term"} />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              {terms.map((term) => (
                <SelectItem key={term.id} value={term.name}>
                  {term.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterYear} onValueChange={setFilterYear} disabled={academicLoading}>
            <SelectTrigger className="h-10 rounded-xl border-gray-300 bg-white min-w-32">
              <SelectValue placeholder={academicLoading ? "Loading..." : "Select Session"} />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              {sessions.map((session) => (
                <SelectItem key={session.id} value={session.name}>
                  {session.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleOpenRegisterDialog}
          className="bg-[#2563EB] hover:bg-[#1E40AF] text-white rounded-xl shadow-md hover:scale-105 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          Register Subjects
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Total Registrations</p>
                <p className="text-2xl font-bold text-gray-900">{filteredRegistrations.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Classes Registered</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(filteredRegistrations.map(r => r.classId)).size}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Core Subjects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredRegistrations.filter(r => r.isCore).length}
                </p>
              </div>
              <Check className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm">Elective Subjects</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredRegistrations.filter(r => !r.isCore).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registrations Table */}
      <Card className="rounded-xl bg-white border border-gray-200 shadow-sm">
        <CardHeader className="p-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg text-gray-900">
              Subject Registrations ({filteredRegistrations.length})
            </h3>
            <Badge className="bg-[#2563EB] text-white border-0">
              {filterTerm} - {filterYear}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#2563EB] border-none hover:bg-[#2563EB]">
                  <TableHead className="text-white">Class</TableHead>
                  <TableHead className="text-white">Subject</TableHead>
                  <TableHead className="text-white">Code</TableHead>
                  <TableHead className="text-white">Type</TableHead>
                  <TableHead className="text-white">Term</TableHead>
                  <TableHead className="text-white">Academic Year</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center">
                        <BookOpen className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-gray-500">No subject registrations found</p>
                        <p className="text-gray-400 text-sm mt-1">
                          Try adjusting filters or register subjects for classes
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRegistrations.map((registration) => (
                    <TableRow key={registration.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{registration.className}</TableCell>
                      <TableCell>{registration.subjectName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-gray-300">
                          {registration.subjectCode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={registration.isCore ? "bg-purple-100 text-purple-800" : "bg-orange-100 text-orange-800"}>
                          {registration.isCore ? "Core" : "Elective"}
                        </Badge>
                      </TableCell>
                      <TableCell>{registration.term}</TableCell>
                      <TableCell>{registration.academicYear}</TableCell>
                      <TableCell>
                        <Badge className={registration.status === 'Active' ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                          {registration.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveRegistration(registration.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Register Subjects Dialog */}
      <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
        <DialogContent className="max-w-4xl rounded-xl bg-white border border-gray-200 text-gray-900 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Register Subjects for Class</DialogTitle>
            <DialogDescription className="text-gray-600">
              Select subjects to register for {filterTerm || 'Select Term'} - {filterYear || 'Select Session'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Class Selection */}
            <div className="space-y-2">
              <Label className="text-gray-700">Select Class *</Label>
              <Select
                value={selectedClassId?.toString() || ''}
                onValueChange={(value: string) => setSelectedClassId(value ? parseInt(value) : null)}
              >
                <SelectTrigger className="h-12 rounded-xl border border-gray-300 bg-white text-gray-900">
                  <SelectValue placeholder="Choose a class" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()} className="text-gray-900">
                      {cls.name} - {cls.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject Selection */}
            {selectedClassId && (
              <div className="space-y-2">
                <Label className="text-gray-700">Select Subjects *</Label>
                <div className="border border-gray-300 rounded-xl p-4 max-h-96 overflow-y-auto bg-gray-50">
                  {getAvailableSubjects(selectedClassId).length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">All subjects already registered</p>
                      <p className="text-gray-400 text-sm mt-1">
                        All available subjects have been registered for this class in the current term
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {getAvailableSubjects(selectedClassId).map((subject) => (
                        <div key={subject.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={subject.id.toString()}
                              checked={selectedSubjects.includes(subject.id)}
                              onCheckedChange={() => handleSubjectToggle(subject.id)}
                              className="border-gray-400"
                            />
                            <div>
                              <Label htmlFor={subject.id.toString()} className="text-gray-900 font-medium cursor-pointer">
                                {subject.name}
                              </Label>
                              <p className="text-gray-500 text-sm">{subject.code} • {subject.department}</p>
                            </div>
                          </div>
                          <Badge className={subject.isCore ? "bg-purple-100 text-purple-800" : "bg-orange-100 text-orange-800"}>
                            {subject.isCore ? "Core" : "Elective"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Selected: {selectedSubjects.length} subject(s)
                </p>
              </div>
            )}

            {/* Registration Guidelines */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#2563EB] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-gray-900 text-sm mb-1">Registration Guidelines</p>
                  <p className="text-gray-600 text-xs">
                    • Register subjects for each class per term and academic year
                    <br />
                    • Core subjects are mandatory for each class
                    <br />
                    • Elective subjects can be added based on class requirements
                    <br />
                    • Registration period: {filterTerm || 'Select Term'} - {filterYear || 'Select Session'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={() => setIsRegisterDialogOpen(false)}
              variant="outline"
              className="rounded-xl border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegisterSubjects}
              disabled={!selectedClassId || selectedSubjects.length === 0}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl shadow-sm"
            >
              <Check className="w-4 h-4 mr-2" />
              Register {selectedSubjects.length} Subject(s)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
