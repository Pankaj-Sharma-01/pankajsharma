import type { Project } from "@/types/content";

/** Shown in the order listed, grouped by category. Add `url` for public repos or demos. */
export const projects: readonly Project[] = [
  {
    name: "Tezbid",
    category: "production",
    organization: "Valiance Solutions",
    summary:
      "Air-gapped GenAI platform that evaluates government tenders, a process that otherwise takes around 80 days. Live at IOCL and under evaluation at other PSUs.",
    metric: { value: "88.6%", label: "extraction accuracy" },
    details: [
      "Runs on self-managed H100s with no external network access.",
      "Combines RAG, a LoRA-tuned Phi-4 multimodal model, and agents.",
    ],
    technologies: ["RAG", "Phi-4 multimodal", "LoRA", "Agents", "H100"],
  },
  {
    name: "Harvest AI",
    category: "production",
    organization: "Lyzr AI",
    summary:
      "Document-extraction platform for contracts and insurance documents, and the backbone of Willis Towers Watson's extraction apps.",
    metric: { value: "96%+", label: "field-level accuracy" },
    details: ["Accuracy validated against ground-truth labels."],
    technologies: ["Document extraction"],
  },
  {
    name: "RBAC authentication SDK",
    category: "production",
    organization: "Lyzr AI",
    summary: "Reusable role-based access control module, adopted across Lyzr's apps and teams.",
    technologies: ["RBAC", "SDK"],
  },
  {
    name: "LinkedIn Post Generator",
    category: "personal",
    summary:
      "Multi-agent app that scans the web for the best tech and AI developments, essays, and geostrategic news, then drafts posts. Built to solve my own problem of keeping up with the field and sharing what I learn.",
    technologies: ["LangGraph", "Multi-agent"],
  },
  {
    name: "Portable RAG framework",
    category: "personal",
    summary: "Milvus-based toolkit for setting up a RAG pipeline quickly.",
    technologies: ["Milvus", "RAG"],
  },
  {
    name: "NIT Hamirpur placement portal",
    category: "personal",
    summary: "Automated the college's placement workflow.",
  },
  {
    name: "Federated learning BERT model",
    category: "personal",
    summary:
      "College project training a spam-detection model across 16 simulated clients on a 50K-email dataset.",
    metric: { value: "95%", label: "accuracy" },
    technologies: ["Flower", "PyTorch", "BERT"],
  },
  {
    name: "Algorithmic trading strategies",
    category: "personal",
    summary: "Built and tested custom trading strategies.",
  },
];
