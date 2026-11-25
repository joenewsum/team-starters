-- Value Starter v2 (Nov 25): customers, the value, the score, and how the team sorts its week.
-- Surveys already running keep their own copy of the questions (see 0005).
update public.templates
set version = 2,
    description = 'How your team sees the people who depend on it, the value it creates, and where the week goes.',
    questions = $json$[
  {"id": "role", "type": "choice", "text": "Are you the team's leader or a team member?",
   "options": ["Leader", "Team member"], "required": true},
  {"id": "customers", "type": "text", "text": "Who depends on our work the most?",
   "hint": "Your customers can be outside the company or other teams inside it.", "required": true},
  {"id": "value", "type": "text", "text": "In one or two sentences, how would you describe the value we create for them?",
   "required": true},
  {"id": "score", "type": "scale", "text": "If they rated that value from 1 to 10, what would they say?",
   "min": 1, "max": 10, "minLabel": "They'd barely notice us", "maxLabel": "They couldn't do without us",
   "required": true},
  {"id": "score_why", "type": "text", "text": "Why that score?", "required": true},
  {"id": "path_to_10", "type": "text", "text": "What would it take to get to a 10?", "required": true},
  {"id": "numbers", "type": "text", "text": "What number would move if we created more value?", "required": true},
  {"id": "work_buckets", "type": "buckets",
   "text": "Think about a typical week. What work would you put in each bucket?",
   "parts": [
     {"id": "high", "label": "High value"},
     {"id": "medium", "label": "Medium value"},
     {"id": "low", "label": "Low value"},
     {"id": "none", "label": "No value"}
   ], "required": true},
  {"id": "value_mix", "type": "mix",
   "text": "Now split a typical week across those buckets. They add up to 100%.",
   "parts": [
     {"id": "high", "label": "High value"},
     {"id": "medium", "label": "Medium value"},
     {"id": "low", "label": "Low value"},
     {"id": "none", "label": "No value"}
   ], "required": true},
  {"id": "one_change", "type": "text",
   "text": "If you could change one thing to create more value, what would it be?",
   "hint": "Optional", "required": false}
]$json$::jsonb
where id = 'value-starter';
