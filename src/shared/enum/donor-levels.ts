export const DonorLevels = {
  quarter: { value: 'quarter', label: 'רבע', icon: '🔸' },
  half: { value: 'half', label: 'חצי', icon: '🔹' },
  full: { value: 'full', label: 'שלם', icon: '⭕' },
  bronze_lords: { value: 'bronze_lords', label: 'אדני נחושת', icon: '🥉' },
  silver_stones: { value: 'silver_stones', label: 'אבני כסף', icon: '🥈' },
  gold_pillars: { value: 'gold_pillars', label: 'עמודי זהב', icon: '🥇' },
  sapphire_diamond: { value: 'sapphire_diamond', label: 'ספיר ויהלום', icon: '💎' },
  platinum: { value: 'platinum', label: 'פלטיניום', icon: '👑' },
  patron: { value: 'patron', label: 'פטרון', icon: '🏆' },
  torah_holder: { value: 'torah_holder', label: 'מחזיק תורה', icon: '📜' },
  supreme_level_1: { value: 'supreme_level_1', label: 'עץ חיים', icon: '🌳' },
  supreme_level_2: { value: 'supreme_level_2', label: 'כתר תורה', icon: '👑' }
} as const;

export type DonorLevelKey = keyof typeof DonorLevels;
export type DonorLevel = typeof DonorLevels[DonorLevelKey];

export const DONOR_LEVELS_ARRAY = Object.values(DonorLevels);