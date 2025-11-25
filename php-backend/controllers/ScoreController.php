<?php

class ScoreController {
    private $scoreModel;

    public function __construct() {
        $this->scoreModel = new Score();
    }

    public function getAll() {
        $options = [];
        
        // Parse query parameters
        if (isset($_GET['student_id'])) {
            $options['student_id'] = (int)$_GET['student_id'];
        }
        
        if (isset($_GET['class_id'])) {
            $options['class_id'] = (int)$_GET['class_id'];
        }
        
        if (isset($_GET['subject_id'])) {
            $options['subject_id'] = (int)$_GET['subject_id'];
        }
        
        if (isset($_GET['term_id'])) {
            $options['term_id'] = (int)$_GET['term_id'];
        }
        
        if (isset($_GET['session_id'])) {
            $options['session_id'] = (int)$_GET['session_id'];
        }
        
        if (isset($_GET['assessment_type'])) {
            $options['assessment_type'] = $_GET['assessment_type'];
        }
        
        if (isset($_GET['status'])) {
            $options['status'] = $_GET['status'];
        }
        
        if (isset($_GET['limit'])) {
            $options['limit'] = (int)$_GET['limit'];
        }
        
        if (isset($_GET['offset'])) {
            $options['offset'] = (int)$_GET['offset'];
        }
        
        $scores = $this->scoreModel->getAll($options);
        Response::success($scores, 'Scores retrieved successfully');
    }

    public function getById() {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            Response::error('Score ID is required', 400);
            return;
        }

        $score = $this->scoreModel->findById($id);
        if ($score) {
            Response::success($score, 'Score retrieved successfully');
        } else {
            Response::error('Score not found', 404);
        }
    }

    public function getByStudent() {
        $studentId = $_GET['student_id'] ?? null;
        if (!$studentId) {
            Response::error('Student ID is required', 400);
            return;
        }

        $options = [];
        
        // Parse additional query parameters
        if (isset($_GET['term_id'])) {
            $options['term_id'] = (int)$_GET['term_id'];
        }
        
        if (isset($_GET['session_id'])) {
            $options['session_id'] = (int)$_GET['session_id'];
        }
        
        if (isset($_GET['subject_id'])) {
            $options['subject_id'] = (int)$_GET['subject_id'];
        }
        
        $scores = $this->scoreModel->getByStudent($studentId, $options);
        Response::success($scores, 'Student scores retrieved successfully');
    }

    public function getByClass() {
        $classId = $_GET['class_id'] ?? null;
        if (!$classId) {
            Response::error('Class ID is required', 400);
            return;
        }

        $options = [];
        
        // Parse additional query parameters
        if (isset($_GET['term_id'])) {
            $options['term_id'] = (int)$_GET['term_id'];
        }
        
        if (isset($_GET['session_id'])) {
            $options['session_id'] = (int)$_GET['session_id'];
        }
        
        if (isset($_GET['subject_id'])) {
            $options['subject_id'] = (int)$_GET['subject_id'];
        }
        
        $scores = $this->scoreModel->getByClass($classId, $options);
        Response::success($scores, 'Class scores retrieved successfully');
    }

    public function getStats() {
        $options = [];
        
        // Parse query parameters
        if (isset($_GET['class_id'])) {
            $options['class_id'] = (int)$_GET['class_id'];
        }
        
        if (isset($_GET['term_id'])) {
            $options['term_id'] = (int)$_GET['term_id'];
        }
        
        if (isset($_GET['session_id'])) {
            $options['session_id'] = (int)$_GET['session_id'];
        }
        
        if (isset($_GET['subject_id'])) {
            $options['subject_id'] = (int)$_GET['subject_id'];
        }
        
        $stats = $this->scoreModel->getStats($options);
        Response::success($stats, 'Score statistics retrieved successfully');
    }

    public function create() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            Response::error('Invalid JSON data', 400);
            return;
        }

        // Validate required fields
        $required = ['student_id', 'subject_id', 'term_id', 'session_id', 'assessment_type', 'score'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                Response::error("$field is required", 400);
                return;
            }
        }

        // Validate score range
        if ($data['score'] < 0 || $data['score'] > 100) {
            Response::error('Score must be between 0 and 100', 400);
            return;
        }

        $result = $this->scoreModel->create($data);
        if ($result) {
            Response::success($result, 'Score created successfully');
        } else {
            Response::error('Failed to create score', 500);
        }
    }

    public function bulkCreate() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data || !isset($data['scores']) || !is_array($data['scores'])) {
            Response::error('Invalid JSON data or scores array is required', 400);
            return;
        }

        $scores = $data['scores'];
        $errors = [];
        $savedScores = [];

        foreach ($scores as $index => $scoreData) {
            // Support both normalized (term_id, session_id, class_id, student_id, subject_id, score)
            // and denormalized (ca_score, exam_score) payloads
            
            $isNormalized = isset($scoreData['term_id']) && isset($scoreData['session_id']) && 
                           isset($scoreData['class_id']) && isset($scoreData['score']);
            
            if ($isNormalized) {
                // Normalized schema validation
                $required = ['student_id', 'subject_id', 'term_id', 'session_id', 'class_id', 'score'];
                $valid = true;
                
                foreach ($required as $field) {
                    if (!isset($scoreData[$field])) {
                        $errors[] = "Score at index $index: $field is required";
                        $valid = false;
                        break;
                    }
                }
                
                if (!$valid) continue;
                
                $score = (float)$scoreData['score'];
                if ($score < 0 || $score > 100) {
                    $errors[] = "Score at index $index: score must be between 0 and 100";
                    continue;
                }
                
                $result = $this->scoreModel->create($scoreData);
            } else {
                // Denormalized schema validation (backward compatibility)
                $required = ['student_id', 'subject_id', 'term_id', 'session_id', 'ca_score', 'exam_score'];
                $valid = true;

                foreach ($required as $field) {
                    if (!isset($scoreData[$field])) {
                        $errors[] = "Score at index $index: $field is required";
                        $valid = false;
                        break;
                    }
                }

                if (!$valid) continue;

                $caScore = (int)$scoreData['ca_score'];
                $examScore = (int)$scoreData['exam_score'];

                if ($caScore < 0 || $caScore > 40) {
                    $errors[] = "Score at index $index: ca_score must be between 0 and 40";
                    continue;
                }

                if ($examScore < 0 || $examScore > 60) {
                    $errors[] = "Score at index $index: exam_score must be between 0 and 60";
                    continue;
                }

                $result = $this->scoreModel->create($scoreData);
            }

            if (!$result) {
                $errors[] = "Failed to save score at index $index";
            } else {
                $savedScores[] = $scoreData;
            }
        }

        if (!empty($errors)) {
            Response::error([
                'message' => 'Some scores could not be saved',
                'errors' => $errors,
                'saved_count' => count($savedScores)
            ], 400);
            return;
        }

        Response::success(['saved_count' => count($savedScores)], 'Scores saved successfully');
    }

    public function update() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            Response::error('Invalid JSON data', 400);
            return;
        }

        $id = $data['id'] ?? null;
        if (!$id) {
            Response::error('Score ID is required', 400);
            return;
        }

        // Validate score if provided
        if (isset($data['score']) && ($data['score'] < 0 || $data['score'] > 100)) {
            Response::error('Score must be between 0 and 100', 400);
            return;
        }

        $result = $this->scoreModel->update($id, $data);
        if ($result) {
            Response::success($result, 'Score updated successfully');
        } else {
            Response::error('Failed to update score', 500);
        }
    }

    public function delete() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        $id = $data['id'] ?? null;
        if (!$id) {
            Response::error('Score ID is required', 400);
            return;
        }

        $result = $this->scoreModel->delete($id);
        if ($result) {
            Response::success(null, 'Score deleted successfully');
        } else {
            Response::error('Failed to delete score', 500);
        }
    }

    public function submit() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data || !isset($data['scoreIds']) || !is_array($data['scoreIds'])) {
            Response::error('Invalid JSON data or scoreIds array is required', 400);
            return;
        }

        $scoreIds = $data['scoreIds'];
        $results = [];
        $errors = [];

        foreach ($scoreIds as $scoreId) {
            $result = $this->scoreModel->submit($scoreId);
            if ($result) {
                $results[] = $result;
            } else {
                $errors[] = "Failed to submit score with ID: $scoreId";
            }
        }

        if (empty($errors)) {
            Response::success($results, 'All scores submitted successfully');
        } else {
            Response::error([
                'message' => 'Some scores could not be submitted',
                'errors' => $errors,
                'submitted' => $results
            ], 400);
        }
    }

    public function approve() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data || !isset($data['scoreIds']) || !is_array($data['scoreIds'])) {
            Response::error('Invalid JSON data or scoreIds array is required', 400);
            return;
        }

        $scoreIds = $data['scoreIds'];
        $results = [];
        $errors = [];

        foreach ($scoreIds as $scoreId) {
            $result = $this->scoreModel->approve($scoreId);
            if ($result) {
                $results[] = $result;
            } else {
                $errors[] = "Failed to approve score with ID: $scoreId";
            }
        }

        if (empty($errors)) {
            Response::success($results, 'All scores approved successfully');
        } else {
            Response::error([
                'message' => 'Some scores could not be approved',
                'errors' => $errors,
                'approved' => $results
            ], 400);
        }
    }

    public function reject() {
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data || !isset($data['scoreIds']) || !is_array($data['scoreIds'])) {
            Response::error('Invalid JSON data or scoreIds array is required', 400);
            return;
        }

        $scoreIds = $data['scoreIds'];
        $results = [];
        $errors = [];

        foreach ($scoreIds as $scoreId) {
            $result = $this->scoreModel->reject($scoreId);
            if ($result) {
                $results[] = $result;
            } else {
                $errors[] = "Failed to reject score with ID: $scoreId";
            }
        }

        if (empty($errors)) {
            Response::success($results, 'All scores rejected successfully');
        } else {
            Response::error([
                'message' => 'Some scores could not be rejected',
                'errors' => $errors,
                'rejected' => $results
            ], 400);
        }
    }
}
