-- Simpler value mix: high, medium, low, no, and negative value.
update public.templates
set questions = (
  select jsonb_agg(
    case when q->>'id' = 'value_mix' then
      jsonb_set(q, '{parts}', '[
        {"id": "high", "label": "High value"},
        {"id": "medium", "label": "Medium value"},
        {"id": "low", "label": "Low value"},
        {"id": "none", "label": "No value"},
        {"id": "negative", "label": "Negative value"}
      ]'::jsonb)
    else q end
    order by ord
  )
  from jsonb_array_elements(questions) with ordinality as t(q, ord)
)
where id = 'value-starter';
