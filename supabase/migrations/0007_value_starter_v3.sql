-- Value Starter v3 (Nov 25): sharper measures question, "your" week, and up to three changes.
-- Surveys already running keep their own copy of the questions (see 0005).
update public.templates
set version = 3,
    questions = $json$[
  {"id": "role", "type": "choice", "text": "Are you the team's leader or a team member?",
   "options": ["Leader", "Team member"], "required": true},
  {"id": "customers", "type": "text", "text": "Who depends on our work the most?",
   "hint": "Your customers can be outside the company or other teams inside it.", "required": true},
  {"id": "value", "type": "text", "text": "In one or two sentences, how would you describe the value we create for them?",
   "required": true},
  {"id": "score", "type": "scale", "text": "If they rated that value from 1 to 10, what would they say?",
   "hint": "If you named more than one, think about the most important.",
   "min": 1, "max": 10, "minLabel": "They'd barely notice us", "maxLabel": "They couldn't do without us",
   "required": true},
  {"id": "score_why", "type": "text", "text": "Why that score?", "required": true},
  {"id": "path_to_10", "type": "text", "text": "What would it take to get to a 10?", "required": true},
  {"id": "measures", "type": "text", "text": "What are the most important measures of our success, and why do they matter?",
   "hint": "They can be numbers we track today, or ones we should.", "required": true},
  {"id": "work_buckets", "type": "buckets",
   "text": "Think about your typical week. What work would you put in each bucket?",
   "parts": [
     {"id": "high", "label": "High value"},
     {"id": "medium", "label": "Medium value"},
     {"id": "low", "label": "Low value"},
     {"id": "none", "label": "No value"}
   ], "required": true},
  {"id": "value_mix", "type": "mix",
   "text": "Now split your typical week across those buckets. They add up to 100%.",
   "parts": [
     {"id": "high", "label": "High value"},
     {"id": "medium", "label": "Medium value"},
     {"id": "low", "label": "Low value"},
     {"id": "none", "label": "No value"}
   ], "required": true},
  {"id": "changes", "type": "list", "count": 3,
   "text": "If you could change up to three things to create more value, what would they be?",
   "hint": "Optional. One is fine.", "required": false}
]$json$::jsonb
where id = 'value-starter';
