-- Deterministic demo seed data for MVP

INSERT INTO roles (id, name, description) VALUES
  ('10000000-0000-0000-0000-000000000001', 'student', 'Student role'),
  ('10000000-0000-0000-0000-000000000002', 'organizer', 'Organizer role'),
  ('10000000-0000-0000-0000-000000000003', 'checkin_staff', 'Check-in staff role');

INSERT INTO users (id, email, password_hash, full_name, account_status, created_at, updated_at) VALUES
  ('20000000-0000-0000-0000-000000000001', 'student1@unihub.local', crypt('Password123!', gen_salt('bf')), 'Student One', 'ACTIVE', now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'organizer1@unihub.local', crypt('Password123!', gen_salt('bf')), 'Organizer One', 'ACTIVE', now(), now()),
  ('20000000-0000-0000-0000-000000000003', 'staff1@unihub.local', crypt('Password123!', gen_salt('bf')), 'Staff One', 'ACTIVE', now(), now());

INSERT INTO user_roles (user_id, role_id, created_at) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', now()),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', now()),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', now());

INSERT INTO csv_import_batches (
  id, file_name, checksum, status, total_rows, success_count, error_count, duplicate_count, started_at, finished_at, created_at
) VALUES (
  '30000000-0000-0000-0000-000000000001',
  'students-demo.csv',
  'demo-seed-checksum-001',
  'SUCCESS',
  1,
  1,
  0,
  0,
  now(),
  now(),
  now()
);

INSERT INTO students (
  id, user_id, student_code, full_name, email, faculty, major, class_name, status, import_batch_id, imported_at, created_at, updated_at
) VALUES (
  '40000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'S0000001',
  'Student One',
  'student1@unihub.local',
  'Computer Science',
  'Software Engineering',
  'SE-2025',
  'ACTIVE',
  '30000000-0000-0000-0000-000000000001',
  now(),
  now(),
  now()
);

INSERT INTO rooms (id, name, building, capacity, map_url, status, created_at, updated_at) VALUES
  ('50000000-0000-0000-0000-000000000001', 'H1-201', 'H1', 120, NULL, 'ACTIVE', now(), now()),
  ('50000000-0000-0000-0000-000000000002', 'H1-202', 'H1', 80, NULL, 'ACTIVE', now(), now()),
  ('50000000-0000-0000-0000-000000000003', 'A1-101', 'A1', 60, NULL, 'ACTIVE', now(), now());

INSERT INTO workshops (
  id, title, speaker, description, status, created_by_user_id, created_at, updated_at, published_at
) VALUES
  (
    '60000000-0000-0000-0000-000000000001',
    'Career Launch: CV and Interview Essentials',
    'Dr. Nguyen Thi Lan',
    'Practical workshop for writing strong CVs and preparing for interviews.',
    'PUBLISHED',
    '20000000-0000-0000-0000-000000000002',
    now(),
    now(),
    now()
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    'Hands-on Spring Boot API Foundations',
    'Mr. Tran Minh Khoa',
    'Guided coding workshop covering Spring Boot REST API fundamentals.',
    'PUBLISHED',
    '20000000-0000-0000-0000-000000000002',
    now(),
    now(),
    now()
  );

INSERT INTO workshop_sessions (
  id, workshop_id, room_id, start_at, end_at, status, seat_capacity, seats_confirmed, seats_reserved, fee_type, fee_amount, currency, created_at, updated_at
) VALUES
  (
    '70000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    TIMESTAMP '2026-06-10 08:00:00',
    TIMESTAMP '2026-06-10 10:00:00',
    'OPEN',
    120,
    0,
    0,
    'FREE',
    0,
    'VND',
    now(),
    now()
  ),
  (
    '70000000-0000-0000-0000-000000000002',
    '60000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000002',
    TIMESTAMP '2026-06-12 13:30:00',
    TIMESTAMP '2026-06-12 16:30:00',
    'OPEN',
    80,
    0,
    0,
    'PAID',
    199000.00,
    'VND',
    now(),
    now()
  );
