CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL,
  event_id VARCHAR(255) NULL,
  event_type VARCHAR(100) NOT NULL,
  channel VARCHAR(30) NOT NULL,
  template_key VARCHAR(100) NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(30) NOT NULL,
  read_at TIMESTAMP NULL,
  retry_count INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMP NULL,
  last_error_code VARCHAR(100) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT fk_notifications_recipient FOREIGN KEY (recipient_user_id) REFERENCES users(id),
  CONSTRAINT ck_notifications_delivery_status CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'RETRYING'))
);

CREATE UNIQUE INDEX uq_notifications_event_recipient_channel_not_null
  ON notifications(event_id, recipient_user_id, channel)
  WHERE event_id IS NOT NULL;

CREATE INDEX idx_notifications_recipient_user_id ON notifications(recipient_user_id);
CREATE INDEX idx_notifications_status_next_retry_at ON notifications(status, next_retry_at);
CREATE INDEX idx_notifications_event_type_created_at ON notifications(event_type, created_at);
