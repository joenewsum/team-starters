// The leader profile, asked once, for benchmarks ("teams like yours").
export const PROFILE_FIELDS = [
  {
    id: "function",
    label: "What does your team do?",
    options: [
      "Sales",
      "Marketing",
      "Customer success or support",
      "Product",
      "Engineering or IT",
      "Operations",
      "Supply chain or logistics",
      "Finance",
      "HR or people",
      "Legal or compliance",
      "General management",
      "Other",
    ],
  },
  {
    id: "level",
    label: "What's your role?",
    options: ["Team lead or supervisor", "Manager", "Senior manager or director", "VP", "C-suite or owner"],
  },
  {
    id: "industry",
    label: "What industry is your company in?",
    options: [
      "Technology or software",
      "Financial services",
      "Insurance",
      "Healthcare",
      "Manufacturing",
      "Distribution or wholesale",
      "Retail or consumer",
      "Professional services",
      "Construction or real estate",
      "Energy or utilities",
      "Government, education, or nonprofit",
      "Other",
    ],
  },
  {
    id: "company_size",
    label: "How many people work at your company?",
    options: ["1 to 50", "51 to 200", "201 to 1,000", "1,001 to 10,000", "More than 10,000"],
  },
] as const;

export type ProfileKey = (typeof PROFILE_FIELDS)[number]["id"];
export type Profile = Record<ProfileKey, string>;
