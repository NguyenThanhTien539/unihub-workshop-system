CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  building VARCHAR(100) NULL,
  capacity INT NOT NULL,
  map_url TEXT NULL,
  status VARCHAR(30) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT ck_rooms_capacity_positive CHECK (capacity > 0),
  CONSTRAINT uq_rooms_building_name UNIQUE (building, name)
);

CREATE INDEX idx_rooms_status ON rooms(status);

CREATE TABLE workshops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  speaker VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(30) NOT NULL,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  published_at TIMESTAMP NULL,
  canceled_at TIMESTAMP NULL,
  CONSTRAINT fk_workshops_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_workshops_status ON workshops(status);
CREATE INDEX idx_workshops_created_by_user_id ON workshops(created_by_user_id);
CREATE INDEX idx_workshops_title ON workshops(title);

CREATE TABLE workshop_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id UUID NOT NULL,
  room_id UUID NOT NULL,
  start_at TIMESTAMP NOT NULL,
  end_at TIMESTAMP NOT NULL,
  status VARCHAR(30) NOT NULL,
  seat_capacity INT NOT NULL,
  seats_confirmed INT NOT NULL DEFAULT 0,
  seats_reserved INT NOT NULL DEFAULT 0,
  fee_type VARCHAR(20) NOT NULL,
  fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'VND',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  canceled_at TIMESTAMP NULL,
  CONSTRAINT fk_workshop_sessions_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id),
  CONSTRAINT fk_workshop_sessions_room FOREIGN KEY (room_id) REFERENCES rooms(id),
  CONSTRAINT ck_workshop_sessions_time_order CHECK (end_at > start_at),
  CONSTRAINT ck_workshop_sessions_seat_capacity_positive CHECK (seat_capacity > 0),
  CONSTRAINT ck_workshop_sessions_seats_confirmed_non_negative CHECK (seats_confirmed >= 0),
  CONSTRAINT ck_workshop_sessions_seats_reserved_non_negative CHECK (seats_reserved >= 0),
  CONSTRAINT ck_workshop_sessions_total_seats CHECK (seats_confirmed + seats_reserved <= seat_capacity),
  CONSTRAINT ck_workshop_sessions_fee_rule CHECK (
    (fee_type = 'FREE' AND fee_amount = 0)
    OR
    (fee_type = 'PAID' AND fee_amount > 0)
  ),
  CONSTRAINT ex_workshop_sessions_room_overlap EXCLUDE USING gist (
    room_id WITH =,
    tsrange(start_at, end_at) WITH &&
  ) WHERE (status <> 'CANCELED')
);

CREATE INDEX idx_workshop_sessions_workshop_id ON workshop_sessions(workshop_id);
CREATE INDEX idx_workshop_sessions_room_id ON workshop_sessions(room_id);
CREATE INDEX idx_workshop_sessions_start_at ON workshop_sessions(start_at);
CREATE INDEX idx_workshop_sessions_status_start_at ON workshop_sessions(status, start_at);
