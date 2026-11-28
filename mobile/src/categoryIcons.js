import { colors } from "./theme";

// Icon guessed from the category name (the database has no icon field)
const ICON_RULES = [
  { words: ["food", "dining", "restaurant", "grocer", "lunch", "dinner", "snack"], icon: "restaurant", color: "#EF4444" },
  { words: ["shop", "cloth", "mall"], icon: "cart", color: "#A855F7" },
  { words: ["travel", "trip", "flight", "holiday"], icon: "airplane", color: "#22C55E" },
  { words: ["transport", "fuel", "petrol", "taxi", "cab"], icon: "car", color: "#3B82F6" },
  { words: ["rent", "home", "house"], icon: "home", color: "#EF4444" },
  { words: ["entertain", "movie", "game"], icon: "film", color: "#EC4899" },
  { words: ["health", "medic", "doctor"], icon: "medkit", color: "#14B8A6" },
  { words: ["bill", "electric", "utilit", "recharge"], icon: "flash", color: "#F59E0B" },
  { words: ["palour", "parlour", "salon", "beauty"], icon: "cut", color: "#F472B6" },
  { words: ["salary", "income", "bonus"], icon: "cash", color: "#22C55E" },
];

export function iconFor(cat) {
  const n = (cat?.name || "").toLowerCase();
  const rule = ICON_RULES.find((r) => r.words.some((w) => n.includes(w)));
  const base =
    rule ||
    (cat?.type === "income"
      ? { icon: "cash", color: colors.income }
      : { icon: "pricetag", color: colors.gold });
  // Income categories always use green
  return { icon: base.icon, color: cat?.type === "income" ? colors.income : base.color };
}