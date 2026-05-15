-- Keep the demo workshop list useful for the current-week student browsing flow.
-- PostgreSQL date_trunc('week', ...) starts on Monday.

UPDATE workshops
SET status = 'PUBLISHED',
    published_at = COALESCE(published_at, now()),
    updated_at = now()
WHERE id IN (
  '60000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000002'
);

UPDATE workshop_sessions
SET start_at = date_trunc('week', CURRENT_DATE)::timestamp + interval '2 days 09:00',
    end_at = date_trunc('week', CURRENT_DATE)::timestamp + interval '2 days 11:00',
    status = 'OPEN',
    updated_at = now()
WHERE id = '70000000-0000-0000-0000-000000000001';

UPDATE workshop_sessions
SET start_at = date_trunc('week', CURRENT_DATE)::timestamp + interval '9 days 14:00',
    end_at = date_trunc('week', CURRENT_DATE)::timestamp + interval '9 days 16:00',
    status = 'OPEN',
    updated_at = now()
WHERE id = '70000000-0000-0000-0000-000000000002';
