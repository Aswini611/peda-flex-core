export interface AgeStage {
  key: string;
  label: string;
  emoji: string;
  ageRange: [number, number];
  description: string;
  color: string;
  gradient: string;
  gameComplexity: "basic" | "intermediate" | "advanced" | "expert";
  engagementStyle: string;
  uiTheme: {
    borderRadius: string;
    fontSize: string;
    iconSize: string;
    cardStyle: string;
  };
}

export const AGE_STAGES: AgeStage[] = [
  {
    key: "explorer",
    label: "Explorer",
    emoji: "🌟",
    ageRange: [5, 8],
    description: "Visual, fun, interactive games with colorful animations",
    color: "#22D3EE",
    gradient: "linear-gradient(135deg, #06B6D4, #22D3EE, #67E8F9)",
    gameComplexity: "basic",
    engagementStyle: "Highly visual with rewards, sounds, and animations",
    uiTheme: {
      borderRadius: "24px",
      fontSize: "text-lg",
      iconSize: "text-4xl",
      cardStyle: "rounded-3xl shadow-xl",
    },
  },
  {
    key: "builder",
    label: "Builder",
    emoji: "🔧",
    ageRange: [9, 12],
    description: "Logic-based and interactive challenges with progression",
    color: "#A855F7",
    gradient: "linear-gradient(135deg, #7C3AED, #A855F7, #C084FC)",
    gameComplexity: "intermediate",
    engagementStyle: "Challenge-driven with level unlocks and competitions",
    uiTheme: {
      borderRadius: "16px",
      fontSize: "text-base",
      iconSize: "text-3xl",
      cardStyle: "rounded-2xl shadow-lg",
    },
  },
  {
    key: "strategist",
    label: "Strategist",
    emoji: "🧩",
    ageRange: [13, 16],
    description: "Analytical problem-solving games with strategy elements",
    color: "#F59E0B",
    gradient: "linear-gradient(135deg, #D97706, #F59E0B, #FBBF24)",
    gameComplexity: "advanced",
    engagementStyle: "Strategy-focused with leaderboards and team challenges",
    uiTheme: {
      borderRadius: "12px",
      fontSize: "text-sm",
      iconSize: "text-2xl",
      cardStyle: "rounded-xl shadow-md",
    },
  },
  {
    key: "mastermind",
    label: "Mastermind",
    emoji: "🧠",
    ageRange: [17, 21],
    description: "Advanced reasoning and real-world simulations",
    color: "#EF4444",
    gradient: "linear-gradient(135deg, #DC2626, #EF4444, #F87171)",
    gameComplexity: "expert",
    engagementStyle: "Mastery-focused with deep analytics and mentorship",
    uiTheme: {
      borderRadius: "8px",
      fontSize: "text-sm",
      iconSize: "text-xl",
      cardStyle: "rounded-lg shadow",
    },
  },
];

export function getAgeStage(age: number | null | undefined): AgeStage {
  if (!age) return AGE_STAGES[0];
  const stage = AGE_STAGES.find(
    (s) => age >= s.ageRange[0] && age <= s.ageRange[1]
  );
  return stage || (age < 5 ? AGE_STAGES[0] : AGE_STAGES[3]);
}
