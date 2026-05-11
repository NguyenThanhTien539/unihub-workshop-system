UPDATE users
SET email = 'student1@university.edu.vn',
    full_name = 'Student One',
    password_hash = crypt('Password123!', gen_salt('bf')),
    account_status = 'ACTIVE',
    updated_at = now()
WHERE id = '20000000-0000-0000-0000-000000000001';

UPDATE users
SET email = 'organizer@university.edu.vn',
    full_name = 'Organizer One',
    password_hash = crypt('Password123!', gen_salt('bf')),
    account_status = 'ACTIVE',
    updated_at = now()
WHERE id = '20000000-0000-0000-0000-000000000002';

UPDATE users
SET email = 'checkin@university.edu.vn',
    full_name = 'Check-in Staff One',
    password_hash = crypt('Password123!', gen_salt('bf')),
    account_status = 'ACTIVE',
    updated_at = now()
WHERE id = '20000000-0000-0000-0000-000000000003';

UPDATE students
SET student_code = '23123456',
    full_name = 'Student One',
    email = 'student1@university.edu.vn',
    faculty = 'Software Engineering',
    major = 'Software Engineering',
    class_name = 'SE-2025',
    status = 'ACTIVE',
    updated_at = now()
WHERE id = '40000000-0000-0000-0000-000000000001';
