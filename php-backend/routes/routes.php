<?php
/**
 * API Routes Configuration
 * This file defines all API routes for the application
 */

return [
    // Health check and system info
    'GET /health' => ['HealthController', 'check'],
    'GET /api-docs' => function() {
        // This is a placeholder - in a real app, you'd serve the Swagger UI
        header('Content-Type: application/json');
        echo json_encode([
            'message' => 'API Documentation',
            'swagger' => '/api-docs/swagger.json',
            'ui' => '/api-docs/index.html'
        ]);
        exit;
    },
    'GET /api-docs/swagger.json' => function() {
        require_once __DIR__ . '/../utils/ApiDocGenerator.php';
        
        // System endpoints
        ApiDocGenerator::addRoute('GET', '/health', [
            'summary' => 'Health Check',
            'description' => 'Check the health status of the API and system metrics',
            'tags' => ['System'],
            'responses' => [
                '200' => [
                    'description' => 'System health status',
                    'content' => [
                        'application/json' => [
                            'schema' => [
                                'type' => 'object',
                                'properties' => [
                                    'status' => ['type' => 'string'],
                                    'database' => ['type' => 'object'],
                                    'disk' => ['type' => 'object'],
                                    'rate_limits' => ['type' => 'object'],
                                    'server' => ['type' => 'object']
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ]);
        
        // Auth endpoints
        ApiDocGenerator::addRoute('POST', '/auth/login', [
            'summary' => 'User Login',
            'description' => 'Authenticate user and get access token',
            'tags' => ['Authentication'],
            'requestBody' => [
                'required' => true,
                'content' => [
                    'application/json' => [
                        'schema' => [
                            'type' => 'object',
                            'properties' => [
                                'email' => ['type' => 'string', 'format' => 'email'],
                                'password' => ['type' => 'string', 'format' => 'password']
                            ],
                            'required' => ['email', 'password']
                        ]
                    ]
                ]
            ],
            'responses' => [
                '200' => [
                    'description' => 'Login successful',
                    'content' => [
                        'application/json' => [
                            'schema' => [
                                'type' => 'object',
                                'properties' => [
                                    'status' => ['type' => 'string'],
                                    'token' => ['type' => 'string'],
                                    'user' => ['$ref' => '#/components/schemas/User']
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ]);
        
        // User management endpoints
        ApiDocGenerator::addRoute('GET', '/users', [
            'summary' => 'List Users',
            'description' => 'Get a list of all users (admin only)',
            'tags' => ['Users'],
            'security' => [['bearerAuth' => []]],
            'parameters' => [
                [
                    'name' => 'role',
                    'in' => 'query',
                    'description' => 'Filter by user role',
                    'schema' => ['type' => 'string', 'enum' => ['admin', 'teacher', 'student', 'parent', 'accountant']]
                ],
                [
                    'name' => 'status',
                    'in' => 'query',
                    'description' => 'Filter by user status',
                    'schema' => ['type' => 'string', 'enum' => ['active', 'inactive', 'suspended']]
                ]
            ],
            'responses' => [
                '200' => [
                    'description' => 'List of users',
                    'content' => [
                        'application/json' => [
                            'schema' => [
                                'type' => 'object',
                                'properties' => [
                                    'status' => ['type' => 'string'],
                                    'data' => [
                                        'type' => 'array',
                                        'items' => ['$ref' => '#/components/schemas/User']
                                    ]
                                ]
                            ]
                        ]
                    ]
                ]
            ]
        ]);
        
        // Add more endpoints here...
        
        // Define components
        ApiDocGenerator::addComponent('schemas', 'User', [
            'type' => 'object',
            'properties' => [
                'id' => ['type' => 'integer', 'format' => 'int64'],
                'name' => ['type' => 'string'],
                'email' => ['type' => 'string', 'format' => 'email'],
                'role' => ['type' => 'string', 'enum' => ['admin', 'teacher', 'student', 'parent', 'accountant']],
                'status' => ['type' => 'string', 'enum' => ['active', 'inactive', 'suspended']],
                'created_at' => ['type' => 'string', 'format' => 'date-time'],
                'updated_at' => ['type' => 'string', 'format' => 'date-time']
            ]
        ]);
        
        // Add security scheme
        ApiDocGenerator::addComponent('securitySchemes', 'bearerAuth', [
            'type' => 'http',
            'scheme' => 'bearer',
            'bearerFormat' => 'JWT',
            'description' => 'Enter JWT token in format: Bearer <token>'
        ]);
        
        header('Content-Type: application/json');
        echo ApiDocGenerator::generate();
        exit;
    },

    // Authentication routes
    'POST /auth/login' => ['AuthController', 'login'],
    'POST /auth/refresh' => ['AuthController', 'refresh'],
    'POST /auth/logout' => ['AuthController', 'logout'],
    'POST /auth/logout-all' => ['AuthController', 'logoutAll'],
    'POST /auth/change-password' => ['AuthController', 'changePassword'],
    'GET /auth/profile' => ['AuthController', 'getProfile'],
    'PUT /auth/profile' => ['AuthController', 'updateProfile'],
    'GET /auth/sessions' => ['AuthController', 'getActiveSessions'],
    'POST /setup/create-admin' => ['SetupController', 'createAdmin'],

    // User management routes
    'GET /users' => ['UserController', 'getAll'],
    'GET /users/view' => ['UserController', 'getById'],
    'GET /users/by-role' => ['UserController', 'getByRole'],
    'GET /users/search' => ['UserController', 'search'],
    'GET /users/stats' => ['UserController', 'getStats'],
    'POST /users' => ['UserController', 'create'],
    'PUT /users' => ['UserController', 'update'],
    'DELETE /users' => ['UserController', 'delete'],
    'POST /users/update-status' => ['UserController', 'updateStatus'],

    // Session management routes
    'GET /sessions' => ['SessionController', 'getAll'],
    'GET /sessions/active' => ['SessionController', 'getActive'],
    'GET /sessions/stats' => ['SessionController', 'getStats'],
    'GET /sessions/view' => ['SessionController', 'getById'],
    'POST /sessions' => ['SessionController', 'create'],
    'PUT /sessions' => ['SessionController', 'update'],
    'DELETE /sessions' => ['SessionController', 'delete'],
    'POST /sessions/set-active' => ['SessionController', 'setActive'],

    // Term management routes
    'GET /terms' => ['TermController', 'getAll'],
    'GET /terms/active' => ['TermController', 'getActive'],
    'GET /terms/current' => ['TermController', 'getCurrent'],
    'GET /terms/by-session' => ['TermController', 'getBySession'],
    'GET /terms/stats' => ['TermController', 'getStats'],
    'GET /terms/view' => ['TermController', 'getById'],
    'POST /terms' => ['TermController', 'create'],
    'PUT /terms' => ['TermController', 'update'],
    'DELETE /terms' => ['TermController', 'delete'],
    'POST /terms/set-active' => ['TermController', 'setActive'],
    'GET /terms/search' => ['TermController', 'search'],

    // Class management routes
    'GET /classes' => ['ClassController', 'getAll'],
    'GET /classes/view' => ['ClassController', 'getById'],
    'GET /classes/with-students' => ['ClassController', 'getWithStudents'],
    'GET /classes/with-subjects' => ['ClassController', 'getWithSubjects'],
    'GET /classes/by-level' => ['ClassController', 'getByLevel'],
    'GET /classes/by-teacher' => ['ClassController', 'getByTeacher'],
    'GET /classes/search' => ['ClassController', 'search'],
    'GET /classes/levels' => ['ClassController', 'getLevels'],
    'GET /classes/stats' => ['ClassController', 'getStats'],
    'POST /classes' => ['ClassController', 'create'],
    'PUT /classes' => ['ClassController', 'update'],
    'DELETE /classes' => ['ClassController', 'delete'],
    'POST /classes/assign-subject' => ['ClassController', 'assignSubject'],
    'POST /classes/remove-subject' => ['ClassController', 'removeSubject'],

    // Subject management routes
    'GET /subjects' => ['SubjectController', 'getAll'],
    'GET /subjects/view' => ['SubjectController', 'getById'],
    'GET /subjects/with-classes' => ['SubjectController', 'getWithClasses'],
    'GET /subjects/with-teachers' => ['SubjectController', 'getWithTeachers'],
    'GET /subjects/core' => ['SubjectController', 'getCoreSubjects'],
    'GET /subjects/elective' => ['SubjectController', 'getElectiveSubjects'],
    'GET /subjects/search' => ['SubjectController', 'search'],
    'GET /subjects/not-in-class' => ['SubjectController', 'getSubjectsNotInClass'],
    'GET /subjects/by-department' => ['SubjectController', 'getSubjectsByDepartment'],
    'GET /subjects/teacher-subjects' => ['SubjectController', 'getTeacherSubjects'],
    'GET /subjects/stats' => ['SubjectController', 'getStats'],
    'GET /subjects/department-stats' => ['SubjectController', 'getDepartmentStats'],
    'POST /subjects' => ['SubjectController', 'create'],
    'PUT /subjects' => ['SubjectController', 'update'],
    'DELETE /subjects' => ['SubjectController', 'delete'],
    'POST /subjects/assign-to-class' => ['SubjectController', 'assignToClass'],
    'POST /subjects/remove-from-class' => ['SubjectController', 'removeClass'],
    'POST /subjects/assign-to-teacher' => ['SubjectController', 'assignToTeacher'],
    'POST /subjects/remove-teacher-assignment' => ['SubjectController', 'removeTeacherAssignment'],

    // Student management routes
    'GET /students' => ['StudentController', 'getAll'],
    'GET /students/view' => ['StudentController', 'getById'],
    'GET /students/by-reg-no' => ['StudentController', 'getByRegNo'],
    'GET /students/by-class' => ['StudentController', 'getByClass'],
    'GET /students/by-parent' => ['StudentController', 'getByParent'],
    'GET /students/search' => ['StudentController', 'search'],
    'GET /students/stats' => ['StudentController', 'getStats'],
    'POST /students' => ['StudentController', 'create'],
    'PUT /students' => ['StudentController', 'update'],
    'DELETE /students' => ['StudentController', 'delete'],
    'POST /students/promote' => ['StudentController', 'promote'],
    'POST /students/update-status' => ['StudentController', 'updateStatus'],

    // Score management routes
    'GET /scores' => ['ScoreController', 'getAll'],
    'GET /scores/view' => ['ScoreController', 'getById'],
    'GET /scores/by-student' => ['ScoreController', 'getByStudent'],
    'GET /scores/by-class' => ['ScoreController', 'getByClass'],
    'GET /scores/stats' => ['ScoreController', 'getStats'],
    'POST /scores' => ['ScoreController', 'create'],
    'POST /scores/bulk' => ['ScoreController', 'bulkCreate'],
    'PUT /scores' => ['ScoreController', 'update'],
    'DELETE /scores' => ['ScoreController', 'delete'],
    'POST /scores/submit' => ['ScoreController', 'submit'],
    'POST /scores/approve' => ['ScoreController', 'approve'],
    'POST /scores/reject' => ['ScoreController', 'reject'],
    
    // Result Management
    'POST /results/compile' => ['ResultController', 'compile'],
    'POST /results/approve' => ['ResultController', 'approve'],
    'POST /results/reject' => ['ResultController', 'reject'],
    'GET /results/compiled' => ['ResultController', 'getCompiled'],
    'GET /results/summary' => ['ResultController', 'getSummary'],
    
    // Teacher Assignment Management
    'POST /teacher-assignments' => ['TeacherAssignmentController', 'create'],
    'GET /teacher-assignments' => ['TeacherAssignmentController', 'get'],
    'DELETE /teacher-assignments' => ['TeacherAssignmentController', 'delete'],
    
    // Fee Management
    'POST /fees' => ['FeeController', 'create'],
    'GET /fees' => ['FeeController', 'getAll'],
    'PUT /fees' => ['FeeController', 'update'],
    'DELETE /fees' => ['FeeController', 'delete'],
    
    // Payment Management
    'GET /payments' => ['PaymentController', 'getAll'],
    'POST /payments' => ['PaymentController', 'create'],
    'POST /payments/manual' => ['PaymentController', 'manual'],
    'PUT /payments/verify' => ['PaymentController', 'verify'],
    'GET /payments/pending' => ['PaymentController', 'getPending'],
    'POST /payments/upload-proof' => ['PaymentController', 'uploadProof'],
    'GET /payments/student' => ['PaymentController', 'getByStudent'],
    
    // Notification Management
    'GET /notifications' => ['NotificationController', 'getAll'],
    'POST /notifications/send' => ['NotificationController', 'send'],
    'PUT /notifications/read' => ['NotificationController', 'markAsRead'],
    'DELETE /notifications' => ['NotificationController', 'delete'],
    'GET /notifications/unread-count' => ['NotificationController', 'getUnreadCount'],
    
    // Teacher Management
    'GET /teachers' => ['TeacherController', 'getAll'],
    'POST /teachers' => ['TeacherController', 'create'],
    'PUT /teachers' => ['TeacherController', 'update'],
    'DELETE /teachers' => ['TeacherController', 'delete'],
    'GET /teachers/classes' => ['TeacherController', 'getClasses'],
    
    // Parent Management
    'GET /parents' => ['ParentController', 'getAll'],
    'POST /parents' => ['ParentController', 'create'],
    'PUT /parents' => ['ParentController', 'update'],
    'DELETE /parents' => ['ParentController', 'delete'],
    'GET /parents/children' => ['ParentController', 'getChildren'],
    
    // Accountant Management
    'GET /accountants' => ['AccountantController', 'getAll'],
    'POST /accountants' => ['AccountantController', 'create'],
    'PUT /accountants' => ['AccountantController', 'update'],
    'DELETE /accountants' => ['AccountantController', 'delete'],
    'GET /accountants/dashboard' => ['AccountantController', 'getDashboard'],
    
    // Activity Logs
    'GET /activity-logs' => ['ActivityLogController', 'getAll'],
    'GET /activity-logs/user' => ['ActivityLogController', 'getByUser'],
    'GET /activity-logs/statistics' => ['ActivityLogController', 'getStatistics'],
    'DELETE /activity-logs/clear' => ['ActivityLogController', 'clearOldLogs'],
    
    // School Settings
    'GET /settings' => ['SettingsController', 'getAll'],
    'PUT /settings' => ['SettingsController', 'update'],
    'GET /settings/key' => ['SettingsController', 'getByKey'],
    'POST /settings' => ['SettingsController', 'create'],
    'DELETE /settings' => ['SettingsController', 'delete'],
    
    // Admissions
    'POST /admissions' => ['AdmissionController', 'create'],
    'GET /admissions' => ['AdmissionController', 'getAll'],
    'PUT /admissions/approve' => ['AdmissionController', 'approve'],
    'PUT /admissions/reject' => ['AdmissionController', 'reject'],
    'GET /admissions/statistics' => ['AdmissionController', 'getStatistics'],
    
    // Student Promotions
    'POST /promotions' => ['PromotionController', 'create'],
    'POST /promotions/bulk' => ['PromotionController', 'createBulk'],
    'GET /promotions' => ['PromotionController', 'getAll'],
    'PUT /promotions/approve' => ['PromotionController', 'approve'],
    'PUT /promotions/reject' => ['PromotionController', 'reject'],
    'GET /promotions/statistics' => ['PromotionController', 'getStatistics'],
    'GET /promotions/eligible' => ['PromotionController', 'getEligibleStudents'],

    // Class Subject Registration
    'GET /class-subject-registrations' => ['ClassSubjectRegistrationController', 'getAll'],
    'POST /class-subject-registrations' => ['ClassSubjectRegistrationController', 'create'],
    'POST /class-subject-registrations/bulk' => ['ClassSubjectRegistrationController', 'createBulk'],
    'PUT /class-subject-registrations' => ['ClassSubjectRegistrationController', 'update'],
    'DELETE /class-subject-registrations' => ['ClassSubjectRegistrationController', 'delete'],
    'GET /class-subject-registrations/class' => ['ClassSubjectRegistrationController', 'getByClass'],
    'GET /class-subject-registrations/subject' => ['ClassSubjectRegistrationController', 'getBySubject'],
    'GET /class-subject-registrations/available' => ['ClassSubjectRegistrationController', 'getAvailableSubjects'],
    'GET /class-subject-registrations/statistics' => ['ClassSubjectRegistrationController', 'getStatistics'],

    // Health check endpoint handled above
];
