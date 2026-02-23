-- Supabase security linter fix: make analytics views use security_invoker
-- This avoids SECURITY DEFINER view warnings while preserving the same query logic.

alter view if exists public.chatbot_quality_daily set (security_invoker = true);
alter view if exists public.chatbot_feedback_daily set (security_invoker = true);
alter view if exists public.chatbot_top_citations_7d set (security_invoker = true);

alter view if exists public.chatbot_multimodal_daily set (security_invoker = true);
alter view if exists public.chatbot_memory_daily set (security_invoker = true);

alter view if exists public.chatbot_planner_daily set (security_invoker = true);
alter view if exists public.chatbot_cost_estimate_daily set (security_invoker = true);
alter view if exists public.chatbot_eval_summary_latest set (security_invoker = true);
alter view if exists public.chatbot_regressions_7d set (security_invoker = true);
