-- Link Telegram users to huuman accounts
ALTER TABLE user_profiles
  ADD COLUMN telegram_chat_id bigint UNIQUE;

CREATE INDEX idx_profiles_telegram ON user_profiles (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

-- Registration tokens (Telegram /start -> email registration flow)
CREATE TABLE telegram_registration_tokens (
  token text PRIMARY KEY,
  telegram_chat_id bigint NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '10 minutes'
);

-- Link codes (web user -> Telegram, initiated from web settings)
CREATE TABLE telegram_link_codes (
  code text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '10 minutes'
);

-- Telegram onboarding state (temporary, deleted after completion)
CREATE TABLE telegram_onboarding_state (
  chat_id bigint PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  step_index integer NOT NULL DEFAULT 0,
  question_index integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  message_id bigint,
  created_at timestamptz DEFAULT now()
);
