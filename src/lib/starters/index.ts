import type { Question } from "@/lib/templates";

// The Team Starters live here in code. Change a question here and it goes live
// with the next deploy. Surveys already running keep the questions they started with.
export type Starter = {
  id: string; // matches public.templates.id
  name: string;
  version: number;
  description: string;
  minutes: number;
  questions: Question[];
};

export const VALUE_STARTER: Starter = {
  id: "value-starter",
  name: "Value Starter",
  version: 3,
  description:
    "Who your customers are, the value you create, and where the week goes.",
  minutes: 10,
  questions: [
    {
      id: "role",
      type: "choice",
      text: "Are you the team's leader or a team member?",
      options: ["Leader", "Team member"],
      required: true,
    },
    {
      id: "customers",
      type: "text",
      text: "Who are our customers? List the most important first.",
      hint: "They can be outside the company, other teams inside it, or both.",
      required: true,
    },
    {
      id: "value",
      type: "text",
      text: "In one or two sentences, how would you describe the value we create for them?",
      required: true,
    },
    {
      id: "score",
      type: "scale",
      text: "If they rated that value from 1 to 10, what would they say?",
      hint: "Think about the first one you listed.",
      min: 1,
      max: 10,
      minLabel: "They'd barely notice us",
      maxLabel: "They couldn't do without us",
      required: true,
    },
    {
      id: "score_why",
      type: "text",
      text: "Why that score?",
      required: true,
    },
    {
      id: "path_to_10",
      type: "text",
      text: "What would it take to get to a 10?",
      required: true,
    },
    {
      id: "measures",
      type: "text",
      text: "What are the most important measures of our success, and why do they matter?",
      hint: "They can be numbers we track today, or ones we should.",
      required: true,
    },
    {
      id: "work_buckets",
      type: "buckets",
      text: "Think about your typical week. What work would you put in each bucket?",
      parts: [
        {
          id: "high",
          label: "High value",
        },
        {
          id: "medium",
          label: "Medium value",
        },
        {
          id: "low",
          label: "Low value",
        },
        {
          id: "none",
          label: "No value",
        },
      ],
      required: true,
    },
    {
      id: "value_mix",
      type: "mix",
      text: "Now split your typical week across those buckets. They add up to 100%.",
      parts: [
        {
          id: "high",
          label: "High value",
        },
        {
          id: "medium",
          label: "Medium value",
        },
        {
          id: "low",
          label: "Low value",
        },
        {
          id: "none",
          label: "No value",
        },
      ],
      required: true,
    },
    {
      id: "changes",
      type: "list",
      count: 3,
      ranked: true,
      text: "If you could change up to three things to create more value, what would they be?",
      hint: "Optional. Put the most important first. One is fine.",
      required: false,
    },
  ],
};

export const STARTERS: Starter[] = [VALUE_STARTER];

export function getStarter(id: string): Starter | undefined {
  return STARTERS.find((s) => s.id === id);
}
