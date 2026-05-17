-- Consolidated demo seed data.
-- Combines the previous V9, V11, V13, and V15 seed intent, then adds richer sample data.

TRUNCATE TABLE
  checkin_records,
  qr_tickets,
  payment_intents,
  registrations,
  notifications,
  ai_summaries,
  workshop_documents,
  workshop_sessions,
  workshops,
  rooms,
  students,
  csv_import_errors,
  csv_import_batches,
  refresh_tokens,
  user_roles,
  users,
  roles
RESTART IDENTITY CASCADE;

INSERT INTO roles (id, name, description) VALUES
  ('10000000-0000-0000-0000-000000000001', 'student', 'Student role'),
  ('10000000-0000-0000-0000-000000000002', 'organizer', 'Organizer role'),
  ('10000000-0000-0000-0000-000000000003', 'checkin_staff', 'Check-in staff role');

INSERT INTO users (id, email, password_hash, full_name, account_status, created_at, updated_at, last_login_at) VALUES
  ('20000000-0000-0000-0000-000000000001', 'student1@university.edu.vn', crypt('Password123!', gen_salt('bf')), 'Student One', 'ACTIVE', now() - interval '30 days', now(), now() - interval '1 day'),
  ('20000000-0000-0000-0000-000000000002', 'organizer@university.edu.vn', crypt('Password123!', gen_salt('bf')), 'Organizer One', 'ACTIVE', now() - interval '30 days', now(), now() - interval '2 hours'),
  ('20000000-0000-0000-0000-000000000003', 'checkin@university.edu.vn', crypt('Password123!', gen_salt('bf')), 'Check-in Staff One', 'ACTIVE', now() - interval '30 days', now(), now() - interval '3 hours'),
  ('20000000-0000-0000-0000-000000000004', 'student2@university.edu.vn', crypt('Password123!', gen_salt('bf')), 'Tran Bao Anh', 'ACTIVE', now() - interval '25 days', now(), now() - interval '2 days'),
  ('20000000-0000-0000-0000-000000000005', 'student3@university.edu.vn', crypt('Password123!', gen_salt('bf')), 'Le Quang Huy', 'ACTIVE', now() - interval '25 days', now(), now() - interval '4 days'),
  ('20000000-0000-0000-0000-000000000006', 'student4@university.edu.vn', crypt('Password123!', gen_salt('bf')), 'Pham Thu Trang', 'ACTIVE', now() - interval '20 days', now(), NULL),
  ('20000000-0000-0000-0000-000000000007', 'student5@university.edu.vn', crypt('Password123!', gen_salt('bf')), 'Do Hoai Nam', 'ACTIVE', now() - interval '20 days', now(), now() - interval '5 days'),
  ('20000000-0000-0000-0000-000000000008', 'student6@university.edu.vn', crypt('Password123!', gen_salt('bf')), 'Nguyen Gia Bao', 'ACTIVE', now() - interval '18 days', now(), NULL),
  ('20000000-0000-0000-0000-000000000009', 'organizer2@university.edu.vn', crypt('Password123!', gen_salt('bf')), 'Dang Minh Tri', 'ACTIVE', now() - interval '28 days', now(), now() - interval '1 day'),
  ('20000000-0000-0000-0000-000000000010', 'checkin2@university.edu.vn', crypt('Password123!', gen_salt('bf')), 'Tran Thi Ngan', 'ACTIVE', now() - interval '18 days', now(), NULL);

INSERT INTO user_roles (user_id, role_id, created_at) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', now() - interval '30 days'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', now() - interval '30 days'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', now() - interval '30 days'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', now() - interval '25 days'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', now() - interval '25 days'),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', now() - interval '20 days'),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', now() - interval '20 days'),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', now() - interval '18 days'),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', now() - interval '28 days'),
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000003', now() - interval '18 days');

INSERT INTO csv_import_batches (
  id, file_name, checksum, status, total_rows, success_count, error_count, duplicate_count, started_at, finished_at, created_at
) VALUES
  ('30000000-0000-0000-0000-000000000001', 'students-demo.csv', 'demo-seed-checksum-001', 'SUCCESS', 1, 1, 0, 0, now() - interval '30 days', now() - interval '30 days', now() - interval '30 days'),
  ('30000000-0000-0000-0000-000000000002', 'students_2026_05_01.csv', 'seed-checksum-20260501', 'SUCCESS', 6, 6, 0, 0, now() - interval '16 days', now() - interval '16 days', now() - interval '16 days'),
  ('30000000-0000-0000-0000-000000000003', 'students_2026_05_08.csv', 'seed-checksum-20260508', 'PARTIAL_SUCCESS', 8, 6, 1, 1, now() - interval '9 days', now() - interval '9 days', now() - interval '9 days');

INSERT INTO students (
  id, user_id, student_code, full_name, email, faculty, major, class_name, status, import_batch_id, imported_at, created_at, updated_at
) VALUES
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '23123456', 'Student One', 'student1@university.edu.vn', 'Software Engineering', 'Software Engineering', 'SE-2025', 'ACTIVE', '30000000-0000-0000-0000-000000000001', now() - interval '30 days', now() - interval '30 days', now()),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', '23120002', 'Tran Bao Anh', 'student2@university.edu.vn', 'Information Systems', 'Data Engineering', 'IS-2025', 'ACTIVE', '30000000-0000-0000-0000-000000000002', now() - interval '16 days', now() - interval '16 days', now()),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000005', '23120003', 'Le Quang Huy', 'student3@university.edu.vn', 'Computer Science', 'Artificial Intelligence', 'AI-2025', 'ACTIVE', '30000000-0000-0000-0000-000000000002', now() - interval '16 days', now() - interval '16 days', now()),
  ('40000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000006', '23120004', 'Pham Thu Trang', 'student4@university.edu.vn', 'Business Administration', 'Digital Marketing', 'BA-2025', 'ACTIVE', '30000000-0000-0000-0000-000000000002', now() - interval '16 days', now() - interval '16 days', now()),
  ('40000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000007', '23120005', 'Do Hoai Nam', 'student5@university.edu.vn', 'Computer Science', 'Cyber Security', 'CS-2025', 'ACTIVE', '30000000-0000-0000-0000-000000000002', now() - interval '16 days', now() - interval '16 days', now()),
  ('40000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000008', '23120006', 'Nguyen Gia Bao', 'student6@university.edu.vn', 'Computer Science', 'Software Engineering', 'SE-2025', 'ACTIVE', '30000000-0000-0000-0000-000000000003', now() - interval '9 days', now() - interval '9 days', now()),
  ('40000000-0000-0000-0000-000000000007', NULL, '23120007', 'Vo Thi Kieu', 'kieu.vo@university.edu.vn', 'Information Systems', 'Product Management', 'IS-2025', 'ACTIVE', '30000000-0000-0000-0000-000000000003', now() - interval '9 days', now() - interval '9 days', now()),
  ('40000000-0000-0000-0000-000000000008', NULL, '23120008', 'Bui Minh Chau', 'chau.bui@university.edu.vn', 'Computer Science', 'Computer Vision', 'AI-2025', 'INACTIVE', '30000000-0000-0000-0000-000000000003', now() - interval '9 days', now() - interval '9 days', now());

INSERT INTO csv_import_errors (
  id, batch_id, row_number, student_code, field_name, error_code, error_message, created_at
) VALUES
  ('87000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', 7, '23120002', 'student_code', 'DUPLICATE_STUDENT_CODE', 'Student code already exists in the system.', now() - interval '9 days');

INSERT INTO rooms (id, name, building, capacity, map_url, status, created_at, updated_at) VALUES
  ('50000000-0000-0000-0000-000000000001', 'H1-201', 'H1', 120, NULL, 'ACTIVE', now() - interval '30 days', now()),
  ('50000000-0000-0000-0000-000000000002', 'H1-202', 'H1', 80, NULL, 'ACTIVE', now() - interval '30 days', now()),
  ('50000000-0000-0000-0000-000000000003', 'A1-101', 'A1', 60, NULL, 'ACTIVE', now() - interval '30 days', now()),
  ('50000000-0000-0000-0000-000000000004', 'A2-203', 'A2', 90, NULL, 'ACTIVE', now() - interval '20 days', now()),
  ('50000000-0000-0000-0000-000000000005', 'B2-401', 'B2', 140, NULL, 'ACTIVE', now() - interval '20 days', now()),
  ('50000000-0000-0000-0000-000000000006', 'B3-305', 'B3', 70, NULL, 'ACTIVE', now() - interval '20 days', now()),
  ('50000000-0000-0000-0000-000000000007', 'I-301', 'Innovation Hub', 45, NULL, 'ACTIVE', now() - interval '10 days', now()),
  ('50000000-0000-0000-0000-000000000008', 'Online Zoom 01', 'Online', 300, 'https://maps.example.edu/online-zoom-01', 'ACTIVE', now() - interval '10 days', now());

INSERT INTO workshops (
  id, title, speaker, description, status, created_by_user_id, created_at, updated_at, published_at
) VALUES
  ('60000000-0000-0000-0000-000000000001', 'Career Launch: CV and Interview Essentials', 'Dr. Nguyen Thi Lan', 'Practical workshop for writing strong CVs and preparing for interviews.', 'PUBLISHED', '20000000-0000-0000-0000-000000000002', now() - interval '24 days', now(), now() - interval '23 days'),
  ('60000000-0000-0000-0000-000000000002', 'Hands-on Spring Boot API Foundations', 'Mr. Tran Minh Khoa', 'Guided coding workshop covering Spring Boot REST API fundamentals.', 'PUBLISHED', '20000000-0000-0000-0000-000000000002', now() - interval '22 days', now(), now() - interval '21 days'),
  ('60000000-0000-0000-0000-000000000003', 'Product Thinking for Engineers', 'Ms. Pham Thanh Thao', 'Bridge technical execution with product strategy and user outcomes.', 'PUBLISHED', '20000000-0000-0000-0000-000000000009', now() - interval '20 days', now(), now() - interval '19 days'),
  ('60000000-0000-0000-0000-000000000004', 'Intro to Data Engineering Pipelines', 'Mr. Nguyen Hoang Nam', 'Learn to design resilient ETL pipelines and data lake workflows.', 'PUBLISHED', '20000000-0000-0000-0000-000000000009', now() - interval '18 days', now(), now() - interval '17 days'),
  ('60000000-0000-0000-0000-000000000005', 'Cyber Security Essentials for Students', 'Dr. Le Hong Phuc', 'Threat modeling, secure practices, and campus-ready security basics.', 'PUBLISHED', '20000000-0000-0000-0000-000000000002', now() - interval '16 days', now(), now() - interval '15 days'),
  ('60000000-0000-0000-0000-000000000006', 'AI Portfolio: Build Your First Demo', 'Ms. Le Thu Anh', 'Hands-on demo workshop to publish a student AI portfolio project.', 'PUBLISHED', '20000000-0000-0000-0000-000000000009', now() - interval '14 days', now(), now() - interval '13 days'),
  ('60000000-0000-0000-0000-000000000007', 'Startup Finance Basics', 'Mr. Phan Quoc Viet', 'Understand budgets, burn rate, and funding milestones for student ventures.', 'PUBLISHED', '20000000-0000-0000-0000-000000000002', now() - interval '12 days', now(), now() - interval '11 days'),
  ('60000000-0000-0000-0000-000000000008', 'UX Research Sprint', 'Ms. Nguyen Khanh Linh', 'Plan interviews, synthesize insights, and convert research into backlog decisions.', 'DRAFT', '20000000-0000-0000-0000-000000000009', now() - interval '5 days', now(), NULL);

INSERT INTO workshop_sessions (
  id, workshop_id, room_id, start_at, end_at, status, seat_capacity, seats_confirmed, seats_reserved,
  fee_type, fee_amount, currency, created_at, updated_at
) VALUES
  ('70000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', (CURRENT_DATE + 1) + TIME '09:00', (CURRENT_DATE + 1) + TIME '11:00', 'OPEN', 120, 2, 0, 'FREE', 0, 'VND', now() - interval '20 days', now()),
  ('70000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000002', (CURRENT_DATE + 2) + TIME '14:00', (CURRENT_DATE + 2) + TIME '16:30', 'OPEN', 80, 1, 1, 'PAID', 199000.00, 'VND', now() - interval '18 days', now()),
  ('70000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000003', (CURRENT_DATE + 3) + TIME '09:00', (CURRENT_DATE + 3) + TIME '11:30', 'OPEN', 60, 1, 0, 'FREE', 0, 'VND', now() - interval '16 days', now()),
  ('70000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000004', (CURRENT_DATE + 4) + TIME '14:00', (CURRENT_DATE + 4) + TIME '16:30', 'OPEN', 90, 0, 1, 'PAID', 149000.00, 'VND', now() - interval '14 days', now()),
  ('70000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000005', (CURRENT_DATE + 5) + TIME '08:30', (CURRENT_DATE + 5) + TIME '11:30', 'OPEN', 140, 0, 0, 'FREE', 0, 'VND', now() - interval '12 days', now()),
  ('70000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000006', (CURRENT_DATE + 6) + TIME '13:00', (CURRENT_DATE + 6) + TIME '16:00', 'OPEN', 70, 0, 0, 'PAID', 249000.00, 'VND', now() - interval '10 days', now()),
  ('70000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000002', (CURRENT_DATE - 1) + TIME '15:00', (CURRENT_DATE - 1) + TIME '17:00', 'CLOSED', 80, 2, 0, 'FREE', 0, 'VND', now() - interval '18 days', now()),
  ('70000000-0000-0000-0000-000000000008', '60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', (CURRENT_DATE + 8) + TIME '08:00', (CURRENT_DATE + 8) + TIME '11:00', 'OPEN', 120, 0, 0, 'PAID', 199000.00, 'VND', now() - interval '8 days', now());

INSERT INTO registrations (
  id, student_id, session_id, status, registration_type, reserved_at, confirmed_at, expires_at, canceled_at, created_at, updated_at
) VALUES
  ('80000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'CONFIRMED', 'FREE', NULL, now() - interval '6 days', NULL, NULL, now() - interval '6 days', now() - interval '6 days'),
  ('80000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 'CONFIRMED', 'FREE', NULL, now() - interval '5 days', NULL, NULL, now() - interval '5 days', now() - interval '5 days'),
  ('80000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000002', 'CONFIRMED', 'PAID', now() - interval '4 days', now() - interval '4 days', NULL, NULL, now() - interval '4 days', now() - interval '4 days'),
  ('80000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000002', 'PENDING_PAYMENT', 'PAID', now() - interval '1 hour', NULL, now() + interval '23 hours', NULL, now() - interval '1 hour', now() - interval '1 hour'),
  ('80000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000003', 'CONFIRMED', 'FREE', NULL, now() - interval '2 days', NULL, NULL, now() - interval '2 days', now() - interval '2 days'),
  ('80000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000004', 'PENDING_PAYMENT', 'PAID', now() - interval '2 hours', NULL, now() + interval '22 hours', NULL, now() - interval '2 hours', now() - interval '2 hours'),
  ('80000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000004', 'PAYMENT_FAILED', 'PAID', now() - interval '3 days', NULL, now() - interval '2 days', NULL, now() - interval '3 days', now() - interval '2 days'),
  ('80000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000007', 'CONFIRMED', 'FREE', NULL, now() - interval '10 days', NULL, NULL, now() - interval '10 days', now() - interval '10 days'),
  ('80000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000007', 'CONFIRMED', 'FREE', NULL, now() - interval '10 days', NULL, NULL, now() - interval '10 days', now() - interval '10 days'),
  ('80000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000008', '70000000-0000-0000-0000-000000000003', 'CANCELED', 'FREE', NULL, NULL, NULL, now() - interval '1 day', now() - interval '3 days', now() - interval '1 day');

INSERT INTO payment_intents (
  id, registration_id, idempotency_key, gateway_ref, status, amount, currency, payment_url,
  expires_at, paid_at, failure_reason, created_at, updated_at, provider, provider_transaction_id
) VALUES
  ('81000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000003', 'seed-paid-800000000003', 'ZLP-SEED-0001', 'SUCCEEDED', 199000.00, 'VND', 'https://sandbox.zalopay.vn/pay/seed-0001', now() - interval '3 days', now() - interval '4 days', NULL, now() - interval '4 days', now() - interval '4 days', 'ZALOPAY', 'ZLP-SEED-0001'),
  ('81000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000004', 'seed-pending-800000000004', 'ZLP-SEED-0002', 'PENDING_PAYMENT', 199000.00, 'VND', 'https://sandbox.zalopay.vn/pay/seed-0002', now() + interval '23 hours', NULL, NULL, now() - interval '1 hour', now() - interval '1 hour', 'ZALOPAY', 'ZLP-SEED-0002'),
  ('81000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000006', 'seed-pending-800000000006', 'ZLP-SEED-0003', 'PENDING_GATEWAY', 149000.00, 'VND', 'https://sandbox.zalopay.vn/pay/seed-0003', now() + interval '22 hours', NULL, NULL, now() - interval '2 hours', now() - interval '2 hours', 'ZALOPAY', 'ZLP-SEED-0003'),
  ('81000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000007', 'seed-failed-800000000007', 'ZLP-SEED-0004', 'FAILED', 149000.00, 'VND', 'https://sandbox.zalopay.vn/pay/seed-0004', now() - interval '2 days', NULL, 'Gateway rejected the sandbox payment.', now() - interval '3 days', now() - interval '2 days', 'ZALOPAY', 'ZLP-SEED-0004');

INSERT INTO qr_tickets (
  id, registration_id, qr_token_hash, status, issued_at, expires_at, revoked_at, created_at
) VALUES
  ('82000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'qr-seed-token-hash-0001', 'ACTIVE', now() - interval '6 days', (CURRENT_DATE + 1) + TIME '12:00', NULL, now() - interval '6 days'),
  ('82000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000002', 'qr-seed-token-hash-0002', 'ACTIVE', now() - interval '5 days', (CURRENT_DATE + 1) + TIME '12:00', NULL, now() - interval '5 days'),
  ('82000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000003', 'qr-seed-token-hash-0003', 'ACTIVE', now() - interval '4 days', (CURRENT_DATE + 2) + TIME '17:30', NULL, now() - interval '4 days'),
  ('82000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000005', 'qr-seed-token-hash-0005', 'ACTIVE', now() - interval '2 days', (CURRENT_DATE + 3) + TIME '12:30', NULL, now() - interval '2 days'),
  ('82000000-0000-0000-0000-000000000005', '80000000-0000-0000-0000-000000000008', 'qr-seed-token-hash-0008', 'EXPIRED', now() - interval '10 days', (CURRENT_DATE - 1) + TIME '18:00', NULL, now() - interval '10 days'),
  ('82000000-0000-0000-0000-000000000006', '80000000-0000-0000-0000-000000000009', 'qr-seed-token-hash-0009', 'EXPIRED', now() - interval '10 days', (CURRENT_DATE - 1) + TIME '18:00', NULL, now() - interval '10 days');

INSERT INTO checkin_records (
  id, registration_id, session_id, scanned_by_user_id, sync_event_id, source_mode, scanned_at, server_received_at, created_at
) VALUES
  ('83000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000008', '70000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000003', 'offline-seed-sync-0001', 'OFFLINE_SYNC', (CURRENT_DATE - 1) + TIME '14:54', (CURRENT_DATE - 1) + TIME '15:04', (CURRENT_DATE - 1) + TIME '15:04'),
  ('83000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000009', '70000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000010', NULL, 'ONLINE', (CURRENT_DATE - 1) + TIME '15:02', (CURRENT_DATE - 1) + TIME '15:02', (CURRENT_DATE - 1) + TIME '15:02');

INSERT INTO notifications (
  id, recipient_user_id, event_id, event_type, channel, template_key, title, message, status,
  read_at, retry_count, next_retry_at, last_error_code, created_at, updated_at
) VALUES
  ('86000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'registration-800000000001-confirmed', 'REGISTRATION_CONFIRMED', 'IN_APP', 'registration_confirmed', 'Registration confirmed', 'Your seat for Career Launch has been confirmed.', 'SENT', now() - interval '5 days', 0, NULL, NULL, now() - interval '6 days', now() - interval '5 days'),
  ('86000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000004', 'registration-800000000002-confirmed', 'REGISTRATION_CONFIRMED', 'EMAIL', 'registration_confirmed', 'Workshop registration confirmed', 'Your registration for Career Launch is confirmed.', 'SENT', NULL, 0, NULL, NULL, now() - interval '5 days', now() - interval '5 days'),
  ('86000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000006', 'payment-800000000004-pending', 'PAYMENT_PENDING', 'IN_APP', 'payment_pending', 'Payment pending', 'Complete your payment to keep your Spring Boot workshop seat.', 'PENDING', NULL, 0, NULL, NULL, now() - interval '1 hour', now() - interval '1 hour'),
  ('86000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000007', 'reminder-700000000003', 'WORKSHOP_REMINDER', 'EMAIL', 'workshop_reminder', 'Workshop reminder', 'Product Thinking for Engineers starts soon.', 'RETRYING', NULL, 1, now() + interval '15 minutes', 'SMTP_TEMPORARY_FAILURE', now() - interval '30 minutes', now() - interval '10 minutes'),
  ('86000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000002', 'document-840000000002-summary-failed', 'AI_SUMMARY_FAILED', 'IN_APP', 'ai_summary_failed', 'AI summary failed', 'The summary job for spring-boot-lab.pdf needs attention.', 'FAILED', NULL, 3, NULL, 'AI_TIMEOUT', now() - interval '1 day', now() - interval '1 day');

INSERT INTO workshop_documents (
  id, workshop_id, uploaded_by_user_id, object_key, original_filename, content_type, file_size_bytes,
  checksum, upload_status, created_at, updated_at, uploaded_at
) VALUES
  ('84000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'workshops/60000000/cv-interview-playbook.pdf', 'cv-interview-playbook.pdf', 'application/pdf', 842114, 'doc-checksum-0001', 'UPLOADED', now() - interval '12 days', now() - interval '12 days', now() - interval '12 days'),
  ('84000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'workshops/60000000/spring-boot-lab.pdf', 'spring-boot-lab.pdf', 'application/pdf', 1254901, 'doc-checksum-0002', 'UPLOADED', now() - interval '10 days', now() - interval '1 day', now() - interval '10 days'),
  ('84000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000009', 'workshops/60000000/data-pipeline-checklist.pdf', 'data-pipeline-checklist.pdf', 'application/pdf', 653442, 'doc-checksum-0003', 'UPLOADED', now() - interval '8 days', now() - interval '8 days', now() - interval '8 days');

INSERT INTO ai_summaries (
  id, document_id, workshop_id, status, summary_text, model_name, attempt_count,
  last_error_code, last_error_message, started_at, completed_at, generated_at,
  error_code, error_message, retry_count, next_retry_at, processing_started_at, created_at, updated_at
) VALUES
  ('85000000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'COMPLETED', 'Covers CV structure, interview storytelling, and practice prompts for first internship applications.', 'gpt-4.1-mini', 1, NULL, NULL, now() - interval '12 days', now() - interval '12 days' + interval '5 minutes', now() - interval '12 days' + interval '5 minutes', NULL, NULL, 0, NULL, NULL, now() - interval '12 days', now() - interval '12 days' + interval '5 minutes'),
  ('85000000-0000-0000-0000-000000000002', '84000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002', 'FAILED', NULL, 'gpt-4.1-mini', 3, 'AI_TIMEOUT', 'Timed out while summarizing a large lab handout.', now() - interval '1 day', NULL, NULL, 'AI_TIMEOUT', 'Timed out while summarizing a large lab handout.', 3, now() + interval '30 minutes', NULL, now() - interval '10 days', now() - interval '1 day'),
  ('85000000-0000-0000-0000-000000000003', '84000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000004', 'PROCESSING', NULL, 'gpt-4.1-mini', 1, NULL, NULL, now() - interval '5 minutes', NULL, NULL, NULL, NULL, 0, NULL, now() - interval '5 minutes', now() - interval '8 days', now() - interval '5 minutes');
