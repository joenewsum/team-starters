-- Value mix: high, medium, low, and no value. Safe to run whether or not 0002 ran.
update public.templates
set questions = (
  select jsonb_agg(
    case when q->>'id' = 'value_mix' then
      jsonb_set(q, '{parts}', '[
        {"id": "high", "label": "High value"},
        {"id": "medium", "label": "Medium value"},
        {"id": "low", "label": "Low value"},
        {"id": "none", "label": "No value"}
      ]'::jsonb)
    else q end
    order by ord
  )
  from jsonb_array_elements(questions) with ordinality as t(q, ord)
)
where id = 'value-starter';
