-- UniHub Workshop seed data. Run after schema.sql.

TRUNCATE TABLE
  workshop_materials,
  notifications,
  checkins,
  qr_tickets,
  payments,
  registrations,
  workshop_sessions,
  workshops,
  rooms,
  refresh_tokens,
  student_import_errors,
  students,
  student_imports,
  user_roles,
  users,
  roles
RESTART IDENTITY CASCADE;

INSERT INTO roles (id, code, name, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'student', 'Student', 'Browse workshops, register, pay, and view tickets'),
  ('00000000-0000-0000-0000-000000000002', 'organizer', 'Organizer', 'Create workshops, manage sessions, imports, and materials'),
  ('00000000-0000-0000-0000-000000000003', 'checkin_staff', 'Check-in Staff', 'Scan QR tickets and sync offline check-ins');

INSERT INTO student_imports (
  id, file_name, checksum, status, total_rows, success_count, error_count,
  duplicate_count, started_at, finished_at
) VALUES (
  '00000000-0000-0000-0000-000000000100',
  'sample_students.csv',
  'seed-checksum-sample-students-2026-05-02',
  'PARTIAL_SUCCESS',
  57,
  50,
  4,
  3,
  '2026-05-02 01:00:00+00',
  '2026-05-02 01:00:12+00'
);

INSERT INTO users (id, email, password_hash, full_name, account_status, created_at, updated_at)
SELECT
  ('00000000-0000-0000-0000-' || lpad(gs::text, 12, '0'))::uuid,
  lower(replace(first_name || '.' || last_name || gs::text, ' ', '')) || '@student.unihub.edu',
  '$2a$10$seededHashForDemoOnlyReplaceInRealUse',
  first_name || ' ' || last_name,
  'ACTIVE',
  now(),
  now()
FROM generate_series(1, 50) AS gs
CROSS JOIN LATERAL (
  SELECT
    (ARRAY['An','Binh','Chi','Duc','Giang','Ha','Hieu','Khanh','Linh','Minh','Nam','Ngan','Phuong','Quan','Thao','Trang','Tuan','Vy'])[((gs - 1) % 18) + 1] AS first_name,
    (ARRAY['Nguyen','Tran','Le','Pham','Hoang','Vo','Dang','Bui','Do','Ngo'])[((gs - 1) % 10) + 1] AS last_name
) n;

INSERT INTO users (id, email, password_hash, full_name, account_status) VALUES
  ('00000000-0000-0000-0000-000000000201', 'mai.nguyen@unihub.edu', '$2a$10$seededHashForDemoOnlyReplaceInRealUse', 'Mai Nguyen', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000202', 'huy.tran@unihub.edu', '$2a$10$seededHashForDemoOnlyReplaceInRealUse', 'Huy Tran', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000203', 'lan.pham@unihub.edu', '$2a$10$seededHashForDemoOnlyReplaceInRealUse', 'Lan Pham', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000204', 'son.le@unihub.edu', '$2a$10$seededHashForDemoOnlyReplaceInRealUse', 'Son Le', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000205', 'hoa.vo@unihub.edu', '$2a$10$seededHashForDemoOnlyReplaceInRealUse', 'Hoa Vo', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000301', 'staff.one@unihub.edu', '$2a$10$seededHashForDemoOnlyReplaceInRealUse', 'Check-in Staff One', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000302', 'staff.two@unihub.edu', '$2a$10$seededHashForDemoOnlyReplaceInRealUse', 'Check-in Staff Two', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000303', 'staff.three@unihub.edu', '$2a$10$seededHashForDemoOnlyReplaceInRealUse', 'Check-in Staff Three', 'ACTIVE');

INSERT INTO user_roles (user_id, role_id)
SELECT id, '00000000-0000-0000-0000-000000000001'::uuid
FROM users
WHERE id < '00000000-0000-0000-0000-000000000100'::uuid;

INSERT INTO user_roles (user_id, role_id) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000003');

INSERT INTO students (
  id, user_id, student_code, full_name, email, faculty, major, class_name,
  status, import_batch_id, imported_at
)
SELECT
  ('00000000-0000-0000-0001-' || lpad(gs::text, 12, '0'))::uuid,
  ('00000000-0000-0000-0000-' || lpad(gs::text, 12, '0'))::uuid,
  'UH2026' || lpad(gs::text, 4, '0'),
  u.full_name,
  u.email,
  (ARRAY['Engineering','Business','Information Technology','Design','Languages'])[((gs - 1) % 5) + 1],
  (ARRAY['Software Engineering','Marketing','Information Systems','Digital Media','Business English'])[((gs - 1) % 5) + 1],
  'K26-' || lpad((((gs - 1) % 10) + 1)::text, 2, '0'),
  CASE WHEN gs IN (47, 48) THEN 'INACTIVE' WHEN gs = 49 THEN 'SUSPENDED' WHEN gs = 50 THEN 'GRADUATED' ELSE 'ACTIVE' END,
  '00000000-0000-0000-0000-000000000100',
  '2026-05-02 01:00:12+00'
FROM generate_series(1, 50) AS gs
JOIN users u ON u.id = ('00000000-0000-0000-0000-' || lpad(gs::text, 12, '0'))::uuid;

INSERT INTO student_import_errors (import_id, row_number, student_code, field_name, error_code, error_message, raw_row) VALUES
  ('00000000-0000-0000-0000-000000000100', 52, 'UH20260003', 'student_code', 'CSV_DUPLICATE_STUDENT', 'Duplicate student code in same file; latest valid row is kept.', '{"student_code":"UH20260003"}'),
  ('00000000-0000-0000-0000-000000000100', 54, NULL, 'student_code', 'CSV_REQUIRED_FIELD_MISSING', 'student_code is required.', '{"student_code":""}'),
  ('00000000-0000-0000-0000-000000000100', 55, 'UH20269999', 'email', 'CSV_EMAIL_INVALID', 'email must be a valid address.', '{"student_code":"UH20269999","email":"not-an-email"}'),
  ('00000000-0000-0000-0000-000000000100', 56, 'UH20260007', 'student_code', 'CSV_DUPLICATE_STUDENT', 'Duplicate student code in same file; latest valid row is kept.', '{"student_code":"UH20260007"}');

INSERT INTO rooms (id, name, building, capacity, map_url, status) VALUES
  ('00000000-0000-0000-0000-000000000401', 'A101', 'Innovation Hall', 40, 'https://maps.unihub.local/innovation/a101', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000402', 'A102', 'Innovation Hall', 60, 'https://maps.unihub.local/innovation/a102', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000403', 'B201', 'Career Center', 80, 'https://maps.unihub.local/career/b201', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000404', 'B202', 'Career Center', 100, 'https://maps.unihub.local/career/b202', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000405', 'C301', 'Tech Lab', 120, 'https://maps.unihub.local/tech/c301', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000406', 'C302', 'Tech Lab', 150, 'https://maps.unihub.local/tech/c302', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000407', 'Auditorium 1', 'Main Auditorium', 180, 'https://maps.unihub.local/main/auditorium-1', 'ACTIVE'),
  ('00000000-0000-0000-0000-000000000408', 'Seminar Room 3', 'Library', 50, 'https://maps.unihub.local/library/seminar-3', 'ACTIVE');

WITH workshop_seed AS (
  SELECT *
  FROM (VALUES
    (1, 'System Design for Campus Apps', 'Dr. Linh Hoang', 'Principal Engineer', 'Design resilient systems for high traffic university services.'),
    (2, 'CV Clinic and Portfolio Review', 'Ms. An Tran', 'Career Coach', 'Improve CVs, portfolios, and interview readiness.'),
    (3, 'Applied AI for Study Planning', 'Mr. Minh Pham', 'AI Product Lead', 'Use AI tools responsibly for learning workflows.'),
    (4, 'Cloud Deployment Basics', 'Mr. Duc Le', 'Cloud Architect', 'Deploy backend applications with containers and managed services.'),
    (5, 'Product Thinking for Engineers', 'Ms. Giang Vo', 'Product Manager', 'Translate user problems into product decisions.'),
    (6, 'Payment Safety in Web Apps', 'Mr. Quan Nguyen', 'Fintech Engineer', 'Handle retries, callbacks, and idempotency safely.'),
    (7, 'Mobile Offline First Patterns', 'Ms. Vy Bui', 'Mobile Lead', 'Build mobile apps that work during network loss.'),
    (8, 'Data Analytics with SQL', 'Dr. Son Dang', 'Data Scientist', 'Analyze event and student data with practical SQL.'),
    (9, 'UX Research Sprint', 'Ms. Ngan Do', 'UX Researcher', 'Run quick research sessions and synthesize findings.'),
    (10, 'Backend Testing Strategy', 'Mr. Hieu Ngo', 'Senior Backend Engineer', 'Test transactions, integrations, and domain rules.'),
    (11, 'Public Speaking Lab', 'Ms. Thao Nguyen', 'Communication Trainer', 'Practice short talks and receive structured feedback.'),
    (12, 'Cybersecurity Fundamentals', 'Dr. Khoa Tran', 'Security Specialist', 'Learn common web risks and defensive design.'),
    (13, 'Startup Finance 101', 'Ms. Mai Pham', 'Finance Advisor', 'Understand budgets, pricing, and basic unit economics.'),
    (14, 'Git and Team Collaboration', 'Mr. Tuan Le', 'Engineering Manager', 'Use Git workflows for student software projects.'),
    (15, 'Design Systems in Practice', 'Ms. Chi Vo', 'Design Lead', 'Create consistent UI components and documentation.'),
    (16, 'Interview Algorithms Workshop', 'Mr. Nam Bui', 'Software Engineer', 'Practice problem solving for technical interviews.'),
    (17, 'Research Poster Clinic', 'Dr. Ha Do', 'Research Mentor', 'Improve academic poster structure and clarity.'),
    (18, 'DevOps Incident Drill', 'Mr. Binh Ngo', 'SRE', 'Practice incident response and service recovery.'),
    (19, 'Entrepreneurship Pitch Room', 'Ms. Lan Hoang', 'Startup Mentor', 'Shape and deliver a concise startup pitch.'),
    (20, 'Responsible AI and Ethics', 'Dr. Phuong Dang', 'AI Ethics Researcher', 'Discuss privacy, fairness, and accountability in AI.')
  ) AS v(n, title, speaker_name, speaker_title, description)
)
INSERT INTO workshops (id, title, speaker_name, speaker_title, description, status, created_by_user_id, published_at)
SELECT
  ('00000000-0000-0000-0000-' || lpad((500 + n)::text, 12, '0'))::uuid,
  title,
  speaker_name,
  speaker_title,
  description,
  'PUBLISHED',
  ('00000000-0000-0000-0000-' || lpad((200 + ((n - 1) % 5) + 1)::text, 12, '0'))::uuid,
  '2026-05-02 02:00:00+00'
FROM workshop_seed;

INSERT INTO workshop_sessions (
  id, workshop_id, room_id, start_at, end_at, status, seat_capacity,
  seats_confirmed, seats_reserved, fee_type, fee_amount, currency
)
SELECT
  ('00000000-0000-0000-0000-' || lpad((600 + n)::text, 12, '0'))::uuid,
  ('00000000-0000-0000-0000-' || lpad((500 + n)::text, 12, '0'))::uuid,
  ('00000000-0000-0000-0000-' || lpad((400 + ((n - 1) % 8) + 1)::text, 12, '0'))::uuid,
  ('2026-05-11 08:00:00+00'::timestamptz
    + (((n - 1) / 4) * interval '1 day')
    + (((n - 1) % 4) * interval '2 hours 30 minutes')),
  ('2026-05-11 09:45:00+00'::timestamptz
    + (((n - 1) / 4) * interval '1 day')
    + (((n - 1) % 4) * interval '2 hours 30 minutes')),
  'OPEN',
  CASE WHEN n = 1 THEN 12 WHEN n = 2 THEN 20 ELSE 24 + ((n % 5) * 6) END,
  0,
  0,
  CASE WHEN n IN (3, 6, 8, 12, 16, 19) THEN 'PAID' ELSE 'FREE' END,
  CASE WHEN n IN (3, 6, 8, 12, 16, 19) THEN (50000 + (n % 4) * 25000)::numeric ELSE 0 END,
  'VND'
FROM generate_series(1, 20) AS n;

WITH desired AS (
  SELECT 1 AS session_n, generate_series(1, 12) AS student_n, 'CONFIRMED' AS status
  UNION ALL SELECT 2, generate_series(1, 20), 'CONFIRMED'
  UNION ALL SELECT 3, generate_series(1, 10), 'CONFIRMED'
  UNION ALL SELECT 3, generate_series(11, 15), 'PENDING_PAYMENT'
  UNION ALL SELECT 3, generate_series(16, 17), 'PAYMENT_FAILED'
  UNION ALL
  SELECT session_n, student_n, 'CONFIRMED'
  FROM generate_series(4, 20) AS session_n
  CROSS JOIN LATERAL generate_series(1, 4 + (session_n % 9)) AS student_n
)
INSERT INTO registrations (
  id, user_id, student_id, workshop_id, session_id, status, registration_type,
  registration_idempotency_key, qr_token_hash, expires_at, confirmed_at
)
SELECT
  ('10000000-0000-0000-' || lpad(d.session_n::text, 4, '0') || '-' || lpad(d.student_n::text, 12, '0'))::uuid,
  ('00000000-0000-0000-0000-' || lpad(d.student_n::text, 12, '0'))::uuid,
  ('00000000-0000-0000-0001-' || lpad(d.student_n::text, 12, '0'))::uuid,
  s.workshop_id,
  s.id,
  d.status,
  s.fee_type,
  'reg-' || d.session_n || '-' || d.student_n,
  CASE WHEN d.status = 'CONFIRMED' THEN encode(digest('qr-' || d.session_n || '-' || d.student_n, 'sha256'), 'hex') END,
  CASE WHEN d.status = 'PENDING_PAYMENT' THEN now() + interval '15 minutes' END,
  CASE WHEN d.status = 'CONFIRMED' THEN now() - interval '1 day' END
FROM desired d
JOIN workshop_sessions s ON s.id = ('00000000-0000-0000-0000-' || lpad((600 + d.session_n)::text, 12, '0'))::uuid;

WITH paid_regs AS (
  SELECT
    r.*,
    s.fee_amount,
    row_number() OVER (ORDER BY r.session_id, r.user_id) AS payment_n
  FROM registrations r
  JOIN workshop_sessions s ON s.id = r.session_id
  WHERE r.registration_type = 'PAID'
)
INSERT INTO payments (
  id, registration_id, user_id, provider, provider_payment_id, idempotency_key,
  request_hash, amount, currency, status, failure_code, failure_message, expires_at, paid_at
)
SELECT
  ('20000000-0000-0000-0000-' || lpad(payment_n::text, 12, '0'))::uuid,
  id,
  user_id,
  'mock_gateway',
  CASE WHEN status = 'CONFIRMED' THEN 'mock-pay-' || replace(id::text, '-', '') END,
  'pay-' || replace(id::text, '-', ''),
  encode(digest(id::text || ':' || fee_amount::text || ':VND', 'sha256'), 'hex'),
  fee_amount,
  'VND',
  CASE status WHEN 'CONFIRMED' THEN 'SUCCESS' WHEN 'PENDING_PAYMENT' THEN 'PENDING' ELSE 'FAILED' END,
  CASE WHEN status = 'PAYMENT_FAILED' THEN 'CARD_DECLINED' END,
  CASE WHEN status = 'PAYMENT_FAILED' THEN 'Mock gateway declined the payment.' END,
  CASE WHEN status = 'PENDING_PAYMENT' THEN now() + interval '15 minutes' END,
  CASE WHEN status = 'CONFIRMED' THEN now() - interval '23 hours' END
FROM paid_regs;

INSERT INTO qr_tickets (registration_id, qr_token_hash, status, issued_at, expires_at)
SELECT
  id,
  qr_token_hash,
  'ACTIVE',
  confirmed_at,
  '2026-05-20 23:59:59+00'
FROM registrations
WHERE status = 'CONFIRMED';

UPDATE workshop_sessions s
SET
  seats_confirmed = counts.confirmed_count,
  seats_reserved = counts.reserved_count,
  updated_at = now()
FROM (
  SELECT
    session_id,
    count(*) FILTER (WHERE status = 'CONFIRMED')::int AS confirmed_count,
    count(*) FILTER (WHERE status = 'PENDING_PAYMENT')::int AS reserved_count
  FROM registrations
  GROUP BY session_id
) counts
WHERE s.id = counts.session_id;

WITH confirmed_regs AS (
  SELECT r.*, row_number() OVER (ORDER BY r.created_at, r.id) AS rn
  FROM registrations r
  WHERE r.status = 'CONFIRMED'
)
INSERT INTO checkins (
  registration_id, session_id, scanned_by_user_id, source_mode, sync_status,
  sync_event_id, offline_device_id, qr_token_hash, client_scanned_at,
  server_received_at, synced_at
)
SELECT
  id,
  session_id,
  CASE WHEN rn % 3 = 0 THEN '00000000-0000-0000-0000-000000000302'::uuid ELSE '00000000-0000-0000-0000-000000000301'::uuid END,
  CASE WHEN rn % 4 = 0 THEN 'OFFLINE_SYNC' ELSE 'ONLINE' END,
  CASE WHEN rn % 4 = 0 THEN 'ACCEPTED' ELSE 'SYNCED' END,
  CASE WHEN rn % 4 = 0 THEN 'device-a-' || rn ELSE NULL END,
  CASE WHEN rn % 4 = 0 THEN 'staff-device-a' ELSE NULL END,
  qr_token_hash,
  '2026-05-11 08:20:00+00'::timestamptz + (rn * interval '30 seconds'),
  '2026-05-11 08:21:00+00'::timestamptz + (rn * interval '30 seconds'),
  CASE WHEN rn % 4 = 0 THEN '2026-05-11 10:10:00+00'::timestamptz + (rn * interval '30 seconds') ELSE now() END
FROM confirmed_regs
WHERE rn <= 24;

INSERT INTO checkins (
  registration_id, session_id, scanned_by_user_id, source_mode, sync_status,
  sync_event_id, offline_device_id, qr_token_hash, client_scanned_at,
  server_received_at
) VALUES
  (NULL, '00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000303',
   'OFFLINE_SYNC', 'PENDING_SYNC', 'device-c-pending-001', 'staff-device-c',
   encode(digest('offline-unsynced-valid-looking-token-1', 'sha256'), 'hex'),
   '2026-05-11 13:04:00+00', now()),
  (NULL, '00000000-0000-0000-0000-000000000603', '00000000-0000-0000-0000-000000000303',
   'OFFLINE_SYNC', 'PENDING_SYNC', 'device-c-pending-002', 'staff-device-c',
   encode(digest('offline-unsynced-valid-looking-token-2', 'sha256'), 'hex'),
   '2026-05-11 13:05:00+00', now());

INSERT INTO notifications (
  recipient_user_id, event_id, event_type, channel, template_key, title, message,
  status, read_at, retry_count, next_retry_at, last_error_code
)
SELECT
  user_id,
  'registration-confirmed-' || id,
  'REGISTRATION_CONFIRMED',
  channel,
  'registration.confirmed',
  'Workshop registration confirmed',
  'Your registration has been confirmed. Your QR ticket is ready.',
  CASE WHEN channel = 'EMAIL' AND right(user_id::text, 1) IN ('3', '7') THEN 'RETRYING' ELSE 'SENT' END,
  CASE WHEN channel = 'IN_APP' AND right(user_id::text, 1) IN ('1', '2', '3') THEN now() END,
  CASE WHEN channel = 'EMAIL' AND right(user_id::text, 1) IN ('3', '7') THEN 1 ELSE 0 END,
  CASE WHEN channel = 'EMAIL' AND right(user_id::text, 1) IN ('3', '7') THEN now() + interval '10 minutes' END,
  CASE WHEN channel = 'EMAIL' AND right(user_id::text, 1) IN ('3', '7') THEN 'SMTP_TEMPORARY_FAILURE' END
FROM registrations
CROSS JOIN (VALUES ('IN_APP'), ('EMAIL')) AS c(channel)
WHERE status = 'CONFIRMED'
LIMIT 80;

INSERT INTO workshop_materials (
  id, workshop_id, uploaded_by_user_id, object_key, original_filename, content_type,
  file_size_bytes, checksum, upload_status, summary_status, summary_text, ai_model_name,
  summary_attempt_count, summary_started_at, summary_completed_at
) VALUES
  ('00000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000201',
   'workshops/00000000-0000-0000-0000-000000000501/documents/system-design-guide.pdf',
   'system-design-guide.pdf', 'application/pdf', 845120, 'material-checksum-001', 'UPLOADED',
   'COMPLETED', 'Covers capacity planning, queueing, idempotency, and database locking for high traffic campus systems.',
   'mock-ai-summary-v1', 1, now() - interval '2 days', now() - interval '2 days' + interval '2 minutes'),
  ('00000000-0000-0000-0000-000000000902', '00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000203',
   'workshops/00000000-0000-0000-0000-000000000503/documents/applied-ai-study-planning.pdf',
   'applied-ai-study-planning.pdf', 'application/pdf', 512440, 'material-checksum-002', 'UPLOADED',
   'PROCESSING', NULL, 'mock-ai-summary-v1', 1, now() - interval '10 minutes', NULL),
  ('00000000-0000-0000-0000-000000000903', '00000000-0000-0000-0000-000000000512', '00000000-0000-0000-0000-000000000202',
   'workshops/00000000-0000-0000-0000-000000000512/documents/security-handout.pdf',
   'security-handout.pdf', 'application/pdf', 902311, 'material-checksum-003', 'UPLOADED',
   'FAILED', NULL, 'mock-ai-summary-v1', 2, now() - interval '1 day', NULL);
