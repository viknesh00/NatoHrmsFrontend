export type AssistantModule = { to: string; label: string };

export const assistantGuides = [
  { path: "/leave", question: "How do I request leave?", topic: /\b(?:request leave|apply for leave|submit a leave request)\b/, answer: "Open **Leave**, select **Apply Leave**, enter your dates and reason, and submit the request." },
  { path: "/attendance", question: "Where can I check attendance?", topic: /\b(?:attendance|clock[- ](?:in|out) records)\b/, answer: "Open **Attendance** from the sidebar. Use **Daily Log** for clock-in and clock-out entries or **Monthly Log** for the monthly summary." },
  { path: "/employees", question: "How can I find an employee record?", topic: /\bemployee (?:list|records?|directory)\b/, answer: "Open **Employees** and use the search field to find an employee by name or email." },
  { path: "/company-documents", question: "Where can I find company documents?", topic: /\b(?:company|workspace) documents\b/, answer: "Open **Documents** in the sidebar. Use the search field to find a document available to you." },
  { path: "/onboarding", question: "Where do I complete onboarding?", topic: /\bonboarding\b/, answer: "Open **Onboarding** to see the records available to you. Ask your HR administrator for the onboarding form link if you need to submit your details." },
  { path: "/Calendar", question: "Where can I see upcoming events?", topic: /\b(?:upcoming events|company holidays)\b/, answer: "Open **Calendar** from the sidebar to see upcoming events and holidays." },
];

export const accessQuestion = "What HRMS areas can I access?";

const normalize = (question: string) => question.trim().toLowerCase().replace(/[?.!]+$/, "");

export function getQuickReply(question: string, modules: AssistantModule[]) {
  const query = normalize(question);
  if (query === normalize(accessQuestion) || (/\b(?:what|which)\b/.test(query) && /\b(?:pages|areas|modules)\b.*\b(?:available|access)\b/.test(query))) {
    return modules.length ? `Your sidebar includes ${modules.map(({ label }) => `**${label}**`).join(", ")}.`
      : "The pages available to you will appear in the sidebar. If it is empty, contact your HR administrator.";
  }
  const asksWhere = /\b(?:where (?:can|do) i|which (?:\w+ ){0,2}(?:page|tab|section)|how (?:can|do) i (?:find|see|view|check|request|apply))\b/.test(query);
  const matchingTopics = asksWhere ? assistantGuides.filter(item => item.topic.test(query)) : [];
  const guide = assistantGuides.find(item => normalize(item.question) === query) ?? (matchingTopics.length === 1 ? matchingTopics[0] : null);
  if (!guide) return null;

  return modules.some(({ to }) => to === guide.path)
    ? guide.answer
    : "This page is unavailable for your account. Contact your HR administrator for help.";
}
