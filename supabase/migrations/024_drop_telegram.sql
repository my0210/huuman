DROP TABLE IF EXISTS telegram_onboarding_state;
DROP TABLE IF EXISTS telegram_link_codes;
DROP TABLE IF EXISTS telegram_registration_tokens;
DROP INDEX IF EXISTS idx_profiles_telegram;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS telegram_chat_id;
