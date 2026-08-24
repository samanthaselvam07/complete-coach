import {
  AlertCircle,
  BarChart3,
  Brain,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  FileText,
  LineChart,
  MessageSquareText,
  NotebookTabs,
  ShieldCheck,
  Target,
  UsersRound,
  Zap
} from "lucide-react";

export const navItems = [
  { href: "/platform", label: "Platform" },
  { href: "/resources", label: "Resources" },
  { href: "/pricing", label: "Pricing" },
  { href: "/roadmap", label: "Roadmap" }
];

export const homeHero = {
  eyebrow: "Built for coaches who think",
  headline: "Coach smarter. Scale faster.",
  subheadline:
    "Complete Coach is the AI operating system for online fitness coaches. One place for everything. Intelligence that tells you where to look.",
  primaryCta: "Apply for Founding Access",
  secondaryCta: "See the Platform"
};

export const problemCopy = {
  heading: "Most coaching platforms store data. They do not help you think.",
  body: [
    "You have a platform. You have the check-ins coming in. And you still spend hours every week trying to hold your whole client base in your head at once.",
    "Who has gone quiet? Who is close to cancelling before they tell you? Nothing in any tool you are using tells you where to look.",
    "Complete Coach does."
  ]
};

export const platformPillars = [
  {
    icon: Brain,
    title: "Client Intelligence",
    text: "AI reads every check-in across your client base and flags who needs your attention first. No more missing the client who is quietly slipping."
  },
  {
    icon: NotebookTabs,
    title: "One Workspace",
    text: "Programmes, check-ins, nutrition, progress, messaging, leads and payments. One platform. No more switching between tools to understand what is happening."
  },
  {
    icon: ShieldCheck,
    title: "Built by a Coach",
    text: "Not built by a tech company that studied coaching. Built by a coach who ran a real client base and knew exactly what was broken."
  }
];

export const proofMetrics = [
  { value: "60", label: "Clients can become too many to hold in your head at once." },
  { value: "1", label: "Prioritised view of who needs your attention first." },
  { value: "0", label: "Need to switch tools just to understand what is happening." }
];

export const platformSections = [
  {
    icon: Brain,
    title: "Check-ins that actually get read.",
    kicker: "Check-In Intelligence",
    body: [
      "Every coach knows the problem. Check-ins come in. You try to hold patterns in your head across 30, 40, 60 clients. You miss things. Not because you stopped caring. Because the tools were never built to help you see them.",
      "Complete Coach reads every check-in across your client base and surfaces what matters. Which clients are trending down. Who went quiet. Who said they were fine but the numbers say otherwise.",
      "You get a prioritised view of your client base every time you open the platform. So you always know where to look first."
    ],
    features: [
      "Custom check-in forms built around what you actually need to know",
      "AI pattern analysis across your full client base",
      "Client attention flags and weekly priority lists",
      "Check-in history and trend visualisation per client",
      "Written and video feedback sent directly in-app"
    ]
  },
  {
    icon: Dumbbell,
    title: "Programmes built the way coaches actually think.",
    kicker: "Programme Delivery",
    body: [
      "Build training programmes that match the way you coach. Templates that actually save time. Exercise libraries you can customise. Progressive overload built in.",
      "Programmes that update based on client progress, not a fixed schedule. And a periodisation layer that lets you plan and visualise long-term training goals across weeks, months, and phases."
    ],
    features: [
      "Exercise library with 4000+ exercises and video demonstrations",
      "Custom exercise builder",
      "Programme templates and duplication",
      "Periodisation planning across the full client journey",
      "Auto-progression and plan adjustments",
      "Training load and volume tracking",
      "Client adherence tracking across training, nutrition, and supplements"
    ]
  },
  {
    icon: Target,
    title: "Nutrition coaching without the spreadsheet.",
    kicker: "Nutrition and Habit Tracking",
    body: [
      "Assign macros, build meal plans, track adherence, and see how nutrition is interacting with training performance. All in the same platform where the rest of the coaching relationship lives."
    ],
    features: [
      "Macro and full meal plan builder",
      "Verified USDA and AUS/NZ food databases with custom food library",
      "Rest day and training day nutrition splits",
      "Extensive supplement database with dosage and frequency recommendations",
      "Habit check-ins built into the daily client view"
    ]
  },
  {
    icon: UsersRound,
    title: "Every client. One view.",
    kicker: "Client Management",
    body: [
      "A single dashboard for every client relationship. Check-in history, programme progress, nutrition adherence, messages, payments. Everything in one place, instantly readable."
    ],
    features: [
      "Full client profile with history and progress timeline",
      "Progress photo uploads and side-by-side comparison",
      "Body composition and measurement tracking",
      "Client notes and internal coach annotations",
      "Onboarding flow with application forms and T&Cs",
      "Goal tracking and milestone management"
    ]
  },
  {
    icon: FileText,
    title: "Turn leads into clients without leaving the platform.",
    kicker: "Lead Capture and CRM",
    body: [
      "Publish application forms, capture prospective clients, and manage your pipeline from enquiry to onboarding. No separate CRM needed."
    ],
    features: [
      "Custom lead capture forms",
      "Prospects dashboard with pipeline view",
      "Lead-to-client conversion flow",
      "Application form builder",
      "Enquiry management and follow-up tracking"
    ]
  },
  {
    icon: BarChart3,
    title: "Run the business, not just the coaching.",
    kicker: "Business Management",
    body: [
      "See how your business is performing. Where your revenue is coming from. Which clients are at risk of churning. What your pipeline looks like.",
      "Complete Coach is not just a client management tool. It is a business operating system."
    ],
    features: [
      "Revenue dashboard and payment tracking",
      "Client retention and churn risk indicators",
      "Capacity and waitlist management",
      "Recurring and one-time payment packages",
      "Automated billing and payment reminders"
    ]
  }
];

export const resourcesCategories = [
  {
    title: "Running a Coaching Business",
    text: "The operational side. Client management, systems, scaling without losing quality, dealing with the things no one prepares you for."
  },
  {
    title: "Client Results and Retention",
    text: "How to keep clients long enough for the work to actually matter. Check-in frameworks, progress conversations, re-engagement strategies."
  },
  {
    title: "Building in Public",
    text: "Following the build of Complete Coach. What is working, what is not, and what we are learning along the way."
  },
  {
    title: "Coach Development",
    text: "The professional side of being a better coach. Communication, decision-making under uncertainty, managing a client base at scale."
  }
];

export const resources = [
  {
    slug: "check-in-form-not-giving-you-what-you-need",
    type: "Running a Coaching Business",
    date: "07 Jul 2026",
    title: "Why Your Check-In Form Is Not Actually Giving You What You Need",
    excerpt:
      "Most check-ins collect answers. Better check-ins reveal what the coach needs to decide next."
  },
  {
    slug: "the-30-client-wall",
    type: "Running a Coaching Business",
    date: "07 Jul 2026",
    title: "The 30-Client Wall: What Changes When You Can No Longer Hold It All in Your Head",
    excerpt:
      "The moment coaching quality starts depending on memory, the business needs a better operating system."
  },
  {
    slug: "know-client-about-to-quit",
    type: "Client Results and Retention",
    date: "07 Jul 2026",
    title: "How to Know a Client Is About to Quit Before They Tell You",
    excerpt:
      "Quiet clients usually leave signals before they leave the business. You need a system that sees them."
  },
  {
    slug: "progress-conversation-stalled",
    type: "Client Results and Retention",
    date: "07 Jul 2026",
    title: "How to Have the Progress Conversation When Progress Has Stalled",
    excerpt:
      "A practical way to talk about slow progress without panic, blame, or pretending it is not happening."
  },
  {
    slug: "why-build-ai-coaching-platform",
    type: "Building in Public",
    date: "07 Jul 2026",
    title: "Why We Decided to Build an AI Coaching Platform and What We Got Wrong First",
    excerpt:
      "The product started with a real coaching problem, not a feature list."
  },
  {
    slug: "best-online-coaches-at-scale",
    type: "Coach Development",
    date: "07 Jul 2026",
    title: "What the Best Online Coaches Do Differently at Scale",
    excerpt:
      "The better the coach, the more visible their standards become."
  }
];

export const plans = [
  {
    name: "Design Partner",
    price: "$29",
    spots: "Limited to 20 coaches",
    description: "For coaches who want direct input into the product before public launch.",
    details:
      "Work closely with the founders. Test early features. Join feedback calls. Help shape what Complete Coach becomes.",
    featured: true,
    features: [
      "Full platform access (Scale tier)",
      "$29/month founder pricing, locked for life",
      "Direct founder access",
      "Priority feature input",
      "Early AI check-in analysis access",
      "Founder badge",
      "Referral commissions up to 30%",
      "Case study opportunity"
    ],
    requirements: [
      "Active fitness coach with real clients",
      "Willing to use the platform with clients during build phase",
      "Available for periodic product feedback sessions"
    ]
  },
  {
    name: "Founding Coach",
    price: "$49",
    spots: "Limited to 100 coaches",
    description: "For coaches who want founding access and lifetime pricing without the design partner commitment.",
    details: "Get in early, lock your rate, and get access to every feature as it ships.",
    features: [
      "Full platform access",
      "$49/month founder pricing, locked for life",
      "Early feature access",
      "Referral commissions up to 20%",
      "Priority onboarding",
      "Private founder community access"
    ],
    requirements: ["Active fitness coach", "Willing to use the platform with real clients", "Basic onboarding feedback"]
  }
];

export const faqs = [
  {
    question: "What is the difference between Design Partner and Founding Coach?",
    answer:
      "Design Partners work directly with the founders to shape the product. They have access to the founding team, join feedback calls, and have direct input into what gets built and when. Founding Coaches get early access and lifetime pricing without that level of involvement."
  },
  {
    question: "Is founding pricing permanent?",
    answer: "Yes. Your founding rate is locked for life. It will never increase as long as you remain on the platform."
  },
  {
    question: "What is the contract?",
    answer: "Monthly. No lock-in. Cancel any time."
  },
  {
    question: "When will I get access?",
    answer:
      "Design Partners get access as features become available during the build phase. Founding Coaches are onboarded in cohorts as the platform reaches key milestones."
  },
  {
    question: "Is Complete Coach available outside Australia?",
    answer: "Yes. Complete Coach is available globally."
  },
  {
    question: "What if I am on the waitlist and a founding spot opens?",
    answer: "We will contact you directly. Waitlist members get first offer on any new founding spots."
  }
];

export const roadmapSections = [
  {
    status: "Live",
    title: "Core Platform",
    intro: "Included from day one for all founding coaches.",
    items: [
      "Client management and profiles",
      "Programme and workout builder",
      "Nutrition planning and tracking",
      "Integrated messaging",
      "Client check-in system",
      "Lead capture and CRM",
      "Content workflow tools"
    ]
  },
  {
    status: "In progress",
    title: "Being built now",
    intro: "Shaped with Design Partner feedback.",
    features: [
      {
        icon: Brain,
        title: "AI Check-In Analysis",
        text:
          "Reads check-in submissions across your client base, surfaces patterns, and generates a priority list showing which clients need your attention first."
      },
      {
        icon: MessageSquareText,
        title: "Branded Client App",
        text:
          "A dedicated mobile app for your clients on iOS and Android. Clean client-facing experience with programme view, check-in submission, messaging, and progress tracking."
      },
      {
        icon: BarChart3,
        title: "Business Management Features",
        text:
          "Revenue overview, active client metrics, renewal tracking, and forward pipeline visibility. Shaped by founder feedback on what coaches actually need to see."
      }
    ]
  },
  {
    status: "Up next",
    title: "Next development cycle",
    features: [
      {
        icon: AlertCircle,
        title: "Client Churn Risk Indicators",
        text:
          "Early warning system for clients showing disengagement patterns before they cancel."
      },
      {
        icon: CreditCard,
        title: "Integrated Payments",
        text:
          "One-time and recurring payment packages. Automated billing. Late payment reminders. No more chasing invoices."
      },
      {
        icon: LineChart,
        title: "Advanced Progress Analytics",
        text:
          "Correlation views across nutrition, training, and body composition. Trend lines, phase comparisons, and automated progress summaries."
      }
    ]
  },
  {
    status: "Planned",
    title: "On the roadmap",
    features: [
      {
        icon: Dumbbell,
        title: "AI Performance Analysis",
        text:
          "Continuous analysis of training data across your full client base. Flag clients trending toward overtraining or under-recovery before performance degrades."
      },
      {
        icon: Target,
        title: "AI Nutrition Insights",
        text:
          "Deep nutritional intelligence beyond calorie counting. Understand what is actually driving body composition outcomes across your client base."
      },
      {
        icon: UsersRound,
        title: "Team Coach Seats",
        text:
          "Add coaches to your account. Share client loads. Maintain oversight across your team with permissions and access levels."
      },
      {
        icon: Zap,
        title: "Automated Workflows",
        text:
          "Trigger actions based on client behaviour. Send reminders, schedule updates, and keep the next action visible."
      },
      {
        icon: MessageSquareText,
        title: "Coach Community",
        text:
          "A private network for coaches on Complete Coach. Share what is working, get input on difficult situations, and access coach-built templates."
      }
    ]
  }
];
