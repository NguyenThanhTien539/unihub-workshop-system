-- Reset demo data and seed a richer dataset

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
  ('b3a6d5d9-49a1-4eb6-8b2b-56f8cb8f3a11', 'student', 'Student role'),
  ('3f1a3f91-0a6a-4af0-9b11-6c2c1c21d5b7', 'organizer', 'Organizer role'),
  ('9c9dd7ac-3e6f-4fa8-9b2a-55b6aa3cf7df', 'checkin_staff', 'Check-in staff role');

INSERT INTO users (id, email, password_hash, full_name, account_status, created_at, updated_at) VALUES
  ('f23f4e6c-6a6b-4f0d-9c86-5ff0c2b2d9c1', 'student1@unihub.local', crypt('Password123!', gen_salt('bf')), 'Nguyen Minh An', 'ACTIVE', now(), now()),
  ('c1e84a4c-4a52-4b3a-9f4c-2a5d9c5d6c2a', 'student2@unihub.local', crypt('Password123!', gen_salt('bf')), 'Tran Bao Anh', 'ACTIVE', now(), now()),
  ('e3a0fcd6-90f6-4b2b-9a06-3a0c15c4f5e1', 'student3@unihub.local', crypt('Password123!', gen_salt('bf')), 'Le Quang Huy', 'ACTIVE', now(), now()),
  ('0b3d7d2a-1a30-4a0a-86a8-08d0a6a5dd4e', 'student4@unihub.local', crypt('Password123!', gen_salt('bf')), 'Pham Thu Trang', 'ACTIVE', now(), now()),
  ('16d8b0c2-1f86-4a24-a3c9-6f2c2f9c3a1a', 'student5@unihub.local', crypt('Password123!', gen_salt('bf')), 'Do Hoai Nam', 'ACTIVE', now(), now()),
  ('6b44a2a1-4cc3-4c05-97f4-8f07e2cc7b90', 'organizer1@unihub.local', crypt('Password123!', gen_salt('bf')), 'Hoang Thu Ha', 'ACTIVE', now(), now()),
  ('5d1c4dc1-2b9a-4b3a-94c5-3a9e7d2e4d03', 'organizer2@unihub.local', crypt('Password123!', gen_salt('bf')), 'Dang Minh Tri', 'ACTIVE', now(), now()),
  ('8c8e1b4a-0db0-4c9f-8a72-4efbf0a11c62', 'staff1@unihub.local', crypt('Password123!', gen_salt('bf')), 'Vu Thanh Phuc', 'ACTIVE', now(), now()),
  ('f44e4052-420a-4a58-9b1a-0a2d8f1a0f5b', 'staff2@unihub.local', crypt('Password123!', gen_salt('bf')), 'Tran Thi Ngan', 'ACTIVE', now(), now());

INSERT INTO user_roles (user_id, role_id, created_at) VALUES
  ('f23f4e6c-6a6b-4f0d-9c86-5ff0c2b2d9c1', 'b3a6d5d9-49a1-4eb6-8b2b-56f8cb8f3a11', now()),
  ('c1e84a4c-4a52-4b3a-9f4c-2a5d9c5d6c2a', 'b3a6d5d9-49a1-4eb6-8b2b-56f8cb8f3a11', now()),
  ('e3a0fcd6-90f6-4b2b-9a06-3a0c15c4f5e1', 'b3a6d5d9-49a1-4eb6-8b2b-56f8cb8f3a11', now()),
  ('0b3d7d2a-1a30-4a0a-86a8-08d0a6a5dd4e', 'b3a6d5d9-49a1-4eb6-8b2b-56f8cb8f3a11', now()),
  ('16d8b0c2-1f86-4a24-a3c9-6f2c2f9c3a1a', 'b3a6d5d9-49a1-4eb6-8b2b-56f8cb8f3a11', now()),
  ('6b44a2a1-4cc3-4c05-97f4-8f07e2cc7b90', '3f1a3f91-0a6a-4af0-9b11-6c2c1c21d5b7', now()),
  ('5d1c4dc1-2b9a-4b3a-94c5-3a9e7d2e4d03', '3f1a3f91-0a6a-4af0-9b11-6c2c1c21d5b7', now()),
  ('8c8e1b4a-0db0-4c9f-8a72-4efbf0a11c62', '9c9dd7ac-3e6f-4fa8-9b2a-55b6aa3cf7df', now()),
  ('f44e4052-420a-4a58-9b1a-0a2d8f1a0f5b', '9c9dd7ac-3e6f-4fa8-9b2a-55b6aa3cf7df', now());

INSERT INTO csv_import_batches (
  id, file_name, checksum, status, total_rows, success_count, error_count, duplicate_count, started_at, finished_at, created_at
) VALUES
  (
    '2c5b1f62-1a0e-45cd-9a1b-9202c0efc2c9',
    'students_2026_05_01.csv',
    'seed-checksum-20260501',
    'SUCCESS',
    5,
    5,
    0,
    0,
    now() - interval '10 days',
    now() - interval '10 days',
    now() - interval '10 days'
  ),
  (
    '93c24b1e-6b0b-46de-a2e4-0d8f18e7c9a1',
    'students_2026_05_08.csv',
    'seed-checksum-20260508',
    'PARTIAL_SUCCESS',
    6,
    5,
    1,
    0,
    now() - interval '3 days',
    now() - interval '3 days',
    now() - interval '3 days'
  );

INSERT INTO students (
  id, user_id, student_code, full_name, email, faculty, major, class_name, status, import_batch_id, imported_at, created_at, updated_at
) VALUES
  (
    'e17a43ef-1a79-4a55-9f70-86a73b6dd3c5',
    'f23f4e6c-6a6b-4f0d-9c86-5ff0c2b2d9c1',
    '23120001',
    'Nguyen Minh An',
    'student1@unihub.local',
    'Computer Science',
    'Software Engineering',
    'SE-2025',
    'ACTIVE',
    '2c5b1f62-1a0e-45cd-9a1b-9202c0efc2c9',
    now() - interval '10 days',
    now() - interval '10 days',
    now() - interval '10 days'
  ),
  (
    'c2b4c39e-5f1d-4b2b-9a2c-8b8c1f8b52fd',
    'c1e84a4c-4a52-4b3a-9f4c-2a5d9c5d6c2a',
    '23120002',
    'Tran Bao Anh',
    'student2@unihub.local',
    'Information Systems',
    'Data Engineering',
    'IS-2025',
    'ACTIVE',
    '2c5b1f62-1a0e-45cd-9a1b-9202c0efc2c9',
    now() - interval '10 days',
    now() - interval '10 days',
    now() - interval '10 days'
  ),
  (
    'b3ef32ce-7d24-4e9b-8d2a-14c1f6f0a4ea',
    'e3a0fcd6-90f6-4b2b-9a06-3a0c15c4f5e1',
    '23120003',
    'Le Quang Huy',
    'student3@unihub.local',
    'Computer Science',
    'Artificial Intelligence',
    'AI-2025',
    'ACTIVE',
    '2c5b1f62-1a0e-45cd-9a1b-9202c0efc2c9',
    now() - interval '10 days',
    now() - interval '10 days',
    now() - interval '10 days'
  ),
  (
    'a76c3cc0-0a12-4a94-9b30-3cc6ad6d0e2a',
    '0b3d7d2a-1a30-4a0a-86a8-08d0a6a5dd4e',
    '23120004',
    'Pham Thu Trang',
    'student4@unihub.local',
    'Business Administration',
    'Digital Marketing',
    'BA-2025',
    'ACTIVE',
    '93c24b1e-6b0b-46de-a2e4-0d8f18e7c9a1',
    now() - interval '3 days',
    now() - interval '3 days',
    now() - interval '3 days'
  ),
  (
    '8b6f5f8b-1f9b-4c5b-8b2a-4f3a2e3c1d7c',
    '16d8b0c2-1f86-4a24-a3c9-6f2c2f9c3a1a',
    '23120005',
    'Do Hoai Nam',
    'student5@unihub.local',
    'Computer Science',
    'Cyber Security',
    'CS-2025',
    'ACTIVE',
    '93c24b1e-6b0b-46de-a2e4-0d8f18e7c9a1',
    now() - interval '3 days',
    now() - interval '3 days',
    now() - interval '3 days'
  ),
  (
    '7c1c7c2f-6f9d-4b63-b4f3-3aef61a9f1d4',
    NULL,
    '23129999',
    'Vo Thi Kieu',
    'kieu.vo@unihub.local',
    'Information Systems',
    'Product Management',
    'IS-2025',
    'ACTIVE',
    '93c24b1e-6b0b-46de-a2e4-0d8f18e7c9a1',
    now() - interval '3 days',
    now() - interval '3 days',
    now() - interval '3 days'
  );

INSERT INTO rooms (id, name, building, capacity, map_url, status, created_at, updated_at) VALUES
  ('0f6a9fd0-2153-4e36-9a1b-992edc6a4c2a', 'H1-201', 'H1', 120, NULL, 'ACTIVE', now(), now()),
  ('1a95a4a7-9a25-4b3b-8f4b-0f8e7d9c9c2b', 'H1-202', 'H1', 80, NULL, 'ACTIVE', now(), now()),
  ('c9f5b2a1-7b0f-4f54-9e9d-7f0d4a7d3b4a', 'A1-101', 'A1', 60, NULL, 'ACTIVE', now(), now()),
  ('5a6d3b2a-7c4d-4d5f-9c6e-1b2f3c4d5e6f', 'A2-203', 'A2', 90, NULL, 'ACTIVE', now(), now()),
  ('9b7c6d5e-4f3a-4b2c-8d7e-6f5e4d3c2b1a', 'B2-401', 'B2', 140, NULL, 'ACTIVE', now(), now()),
  ('d1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a', 'B3-305', 'B3', 70, NULL, 'ACTIVE', now(), now());

INSERT INTO workshops (
  id, title, speaker, description, status, created_by_user_id, created_at, updated_at, published_at
) VALUES
  (
    '7a2fba0e-7c3d-4a65-9c91-0b1d2f3e4a5b',
    'Career Launch: CV and Interview Essentials',
    'Dr. Nguyen Thi Lan',
    'Practical session on crafting strong CVs and preparing for interviews.',
    'PUBLISHED',
    '6b44a2a1-4cc3-4c05-97f4-8f07e2cc7b90',
    now() - interval '20 days',
    now() - interval '20 days',
    now() - interval '20 days'
  ),
  (
    '1d2c3b4a-5f6e-4d7c-8b9a-0c1d2e3f4a5b',
    'Hands-on Spring Boot API Foundations',
    'Mr. Tran Minh Khoa',
    'Guided coding workshop covering Spring Boot REST API fundamentals.',
    'PUBLISHED',
    '6b44a2a1-4cc3-4c05-97f4-8f07e2cc7b90',
    now() - interval '18 days',
    now() - interval '18 days',
    now() - interval '18 days'
  ),
  (
    'b4a5c6d7-e8f9-4a1b-8c2d-3e4f5a6b7c8d',
    'Product Thinking for Engineers',
    'Ms. Pham Thanh Thao',
    'Bridge technical execution with product strategy and user outcomes.',
    'PUBLISHED',
    '5d1c4dc1-2b9a-4b3a-94c5-3a9e7d2e4d03',
    now() - interval '16 days',
    now() - interval '16 days',
    now() - interval '16 days'
  ),
  (
    'c5d6e7f8-9012-4a3b-8c4d-5e6f7a8b9c0d',
    'Intro to Data Engineering Pipelines',
    'Mr. Nguyen Hoang Nam',
    'Learn to design resilient ETL pipelines and data lake workflows.',
    'PUBLISHED',
    '5d1c4dc1-2b9a-4b3a-94c5-3a9e7d2e4d03',
    now() - interval '14 days',
    now() - interval '14 days',
    now() - interval '14 days'
  ),
  (
    'd6e7f890-1234-4b5c-8d6e-7f8a9b0c1d2e',
    'Cyber Security Essentials for Students',
    'Dr. Le Hong Phuc',
    'Threat modeling, secure practices, and campus-ready security basics.',
    'PUBLISHED',
    '6b44a2a1-4cc3-4c05-97f4-8f07e2cc7b90',
    now() - interval '12 days',
    now() - interval '12 days',
    now() - interval '12 days'
  ),
  (
    'e7f89012-3456-4c6d-8e7f-9a0b1c2d3e4f',
    'AI Portfolio: Build Your First Demo',
    'Ms. Le Thu Anh',
    'Hands-on demo workshop to publish a student AI portfolio project.',
    'PUBLISHED',
    '5d1c4dc1-2b9a-4b3a-94c5-3a9e7d2e4d03',
    now() - interval '11 days',
    now() - interval '11 days',
    now() - interval '11 days'
  );

INSERT INTO workshop_sessions (
  id, workshop_id, room_id, start_at, end_at, status, seat_capacity, seats_confirmed, seats_reserved,
  fee_type, fee_amount, currency, created_at, updated_at
) VALUES
  (
    'c0a1b2c3-d4e5-4f6a-8b9c-0d1e2f3a4b5c',
    '7a2fba0e-7c3d-4a65-9c91-0b1d2f3e4a5b',
    '0f6a9fd0-2153-4e36-9a1b-992edc6a4c2a',
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
    'd1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    '1d2c3b4a-5f6e-4d7c-8b9a-0c1d2e3f4a5b',
    '1a95a4a7-9a25-4b3b-8f4b-0f8e7d9c9c2b',
    TIMESTAMP '2026-06-12 13:30:00',
    TIMESTAMP '2026-06-12 16:30:00',
    'OPEN',
    90,
    0,
    0,
    'PAID',
    199000.00,
    'VND',
    now(),
    now()
  ),
  (
    'e2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    'b4a5c6d7-e8f9-4a1b-8c2d-3e4f5a6b7c8d',
    'c9f5b2a1-7b0f-4f54-9e9d-7f0d4a7d3b4a',
    TIMESTAMP '2026-06-13 09:00:00',
    TIMESTAMP '2026-06-13 11:30:00',
    'OPEN',
    60,
    0,
    0,
    'FREE',
    0,
    'VND',
    now(),
    now()
  ),
  (
    'f3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f',
    'c5d6e7f8-9012-4a3b-8c4d-5e6f7a8b9c0d',
    '5a6d3b2a-7c4d-4d5f-9c6e-1b2f3c4d5e6f',
    TIMESTAMP '2026-06-14 14:00:00',
    TIMESTAMP '2026-06-14 16:30:00',
    'OPEN',
    90,
    0,
    0,
    'PAID',
    149000.00,
    'VND',
    now(),
    now()
  ),
  (
    'a4b5c6d7-e8f9-4a1b-9c2d-3e4f5a6b7c8d',
    'd6e7f890-1234-4b5c-8d6e-7f8a9b0c1d2e',
    '9b7c6d5e-4f3a-4b2c-8d7e-6f5e4d3c2b1a',
    TIMESTAMP '2026-06-15 08:30:00',
    TIMESTAMP '2026-06-15 11:30:00',
    'OPEN',
    140,
    0,
    0,
    'FREE',
    0,
    'VND',
    now(),
    now()
  ),
  (
    'b5c6d7e8-f901-4b2c-9d3e-4f5a6b7c8d9e',
    'e7f89012-3456-4c6d-8e7f-9a0b1c2d3e4f',
    'd1e2f3a4-b5c6-4d7e-8f9a-0b1c2d3e4f5a',
    TIMESTAMP '2026-06-16 13:00:00',
    TIMESTAMP '2026-06-16 16:00:00',
    'OPEN',
    70,
    0,
    0,
    'PAID',
    249000.00,
    'VND',
    now(),
    now()
  ),
  (
    'c6d7e8f9-0123-4c4d-8e5f-6a7b8c9d0e1f',
    '7a2fba0e-7c3d-4a65-9c91-0b1d2f3e4a5b',
    '1a95a4a7-9a25-4b3b-8f4b-0f8e7d9c9c2b',
    TIMESTAMP '2026-06-11 15:00:00',
    TIMESTAMP '2026-06-11 17:00:00',
    'OPEN',
    80,
    0,
    0,
    'FREE',
    0,
    'VND',
    now(),
    now()
  ),
  (
    'd7e8f901-2345-4d5e-8f6a-7b8c9d0e1f2a',
    '1d2c3b4a-5f6e-4d7c-8b9a-0c1d2e3f4a5b',
    '0f6a9fd0-2153-4e36-9a1b-992edc6a4c2a',
    TIMESTAMP '2026-06-18 08:00:00',
    TIMESTAMP '2026-06-18 11:00:00',
    'OPEN',
    120,
    0,
    0,
    'PAID',
    199000.00,
    'VND',
    now(),
    now()
  );
