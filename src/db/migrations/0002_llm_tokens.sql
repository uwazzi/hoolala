-- Track per-call token use so the PM agent can watch the credit burn.
-- Token counts only; still no prompt or user text in llm_calls.
ALTER TABLE llm_calls ADD COLUMN prompt_tokens INTEGER;
ALTER TABLE llm_calls ADD COLUMN completion_tokens INTEGER;
