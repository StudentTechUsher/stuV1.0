-- Admin Forecasting views (PoC)
-- Note: Current schema stores plans in grad_plan.plan_details (JSONB)
-- These views are placeholders for future normalization when plan_courses table exists

-- Placeholder view for demand aggregation
-- In PoC, this will return empty and trigger mock data generation
-- When plan_courses table exists, update this view to aggregate from normalized data
CREATE OR REPLACE VIEW public.demand_aggregate AS
SELECT
  NULL::integer as institution_id,
  NULL::text as term_code,
  NULL::text as course_id,
  NULL::text as subject,
  NULL::text as number,
  NULL::text as title,
  NULL::integer as credits,
  NULL::integer as demand_count
WHERE FALSE; -- Returns empty for now

-- Placeholder view for detailed demand (1-term-ahead breakdowns)
CREATE OR REPLACE VIEW public.demand_detail AS
SELECT
  NULL::integer as institution_id,
  NULL::text as term_code,
  NULL::text as course_id,
  NULL::jsonb as detail
WHERE FALSE; -- Returns empty for now

COMMENT ON VIEW public.demand_aggregate IS 'Aggregated course demand across future terms (PoC placeholder - returns empty until plan_courses table exists)';
COMMENT ON VIEW public.demand_detail IS 'Detailed demand breakdowns for 1-term-ahead forecasting (PoC placeholder)';
