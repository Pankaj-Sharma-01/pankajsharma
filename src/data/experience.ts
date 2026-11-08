import type { WorkExperience } from "@/types/content";

/** Most recent first. Omit `end` for a current role. */
export const experience: readonly WorkExperience[] = [
  {
    company: "Lyzr AI",
    role: "Senior AI Engineer",
    start: "2025-12",
    summary:
      "Lead Forward Deployed Engineer for Lyzr's largest account, Willis Towers Watson.",
    highlights: [
      "Grew the account from under $250K to $4M in revenue in about a year, scaling the team from 2–3 developers and 1 PM to 20+ developers and 3 PMs, with 15+ applications deployed.",
      "Designed and built Harvest AI, the document-extraction platform behind WTW's extraction apps: 96%+ field-level accuracy across contracts and insurance documents, validated against ground-truth labels.",
      "Automated M&A and finance workflows spanning 2,600+ insurance carriers, and built a content-generation system for marketing.",
      "Shipped 10+ production AI applications and wrote the RBAC authentication SDK used across Lyzr's teams and apps.",
      "Benchmarked tools and MCPs to improve web-search and RAG accuracy.",
      "Before the WTW pod, delivered 3 applications for Accenture and 2 for Deloitte.",
    ],
    technologies: ["Document extraction", "RAG", "MCP", "RBAC"],
  },
  {
    company: "Valiance Solutions",
    role: "GenAI Engineer (Project Lead)",
    start: "2024-12",
    end: "2025-12",
    highlights: [
      "Architected and led Tezbid, a GenAI tender-evaluation system used by multiple government PSUs, at 88.6% extraction accuracy.",
      "Built an agentic OCR pipeline with multi-model orchestration and custom metrics (95% accuracy).",
      "Fine-tuned Phi-4 multimodal with LoRA for document segmentation on Indian domain data (89%+ accuracy).",
      "Deployed a RAG pipeline ingesting 200K PDF pages a month with 98%+ recall@k.",
    ],
    technologies: ["Agentic OCR", "Phi-4 multimodal", "LoRA", "RAG"],
  },
  {
    company: "Yellow.ai",
    role: "Machine Learning Engineer (NLP)",
    start: "2023-07",
    end: "2024-10",
    highlights: [
      "Built an embedding-based product search pipeline that grew into a new business vertical for the company.",
      "Improved intent retrieval accuracy by 15% with an embedding-based pipeline, and added a layout-aware parsing pipeline to RAG for unstructured data (+7% retrieval accuracy).",
      "Benchmarked and migrated to a new vector database, cutting 800 ms per query.",
      "Added dynamic prompting for pricing data (+10% chatbot answer accuracy).",
    ],
    technologies: ["Embeddings", "Vector databases", "RAG"],
  },
  {
    company: "Yellow.ai",
    role: "Machine Learning Intern (NLP)",
    start: "2023-01",
    end: "2023-06",
    highlights: [
      "Benchmarked re-ranking models, improving retrieval in the Document Cognition pipeline by 5%.",
      "Refactored legacy code and wrote the test suite for the whole pipeline.",
      "Ran topic modeling (LDA, BERTopic) across 50+ bots and preprocessed 1M+ conversations.",
    ],
    technologies: ["Re-ranking", "LDA", "BERTopic"],
  },
  {
    company: "Placewit",
    role: "Machine Learning Trainee",
    start: "2022-06",
    end: "2022-07",
    highlights: [
      "Created ML workbooks and Jupyter notebooks used to teach machine learning in structured courses.",
      "Built Kaggle solution walkthroughs used as teaching material in classes.",
      "Moved from content creation into mentoring, guiding students from multiple cohorts through their own ML projects.",
    ],
    technologies: ["Jupyter", "Kaggle"],
  },
];
