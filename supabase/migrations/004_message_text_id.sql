-- Change messages.id from uuid to text to support AI SDK client-generated IDs
ALTER TABLE public.messages DROP CONSTRAINT messages_pkey;
ALTER TABLE public.messages ALTER COLUMN id SET DATA TYPE text;
ALTER TABLE public.messages ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.messages ADD PRIMARY KEY (id);
