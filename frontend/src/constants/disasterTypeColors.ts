// src/constants/disasterTypeColors.ts

export const DISASTER_TYPE_COLORS: Record<
  string,
  { typeColor: string; tagColor: string }
> = {
  // Meteorological Hazards
  "Tropical Depression": {
    typeColor: "text-sky-300",
    tagColor: "bg-sky-100 text-sky-600",
  },
  "Tropical Storm": {
    typeColor: "text-sky-400",
    tagColor: "bg-sky-100 text-sky-600",
  },
  "Sever Tropical Storm": {
    typeColor: "text-sky-500",
    tagColor: "bg-sky-100 text-sky-600",
  },
  Typhoon: {
    typeColor: "text-sky-500",
    tagColor: "bg-sky-100 text-sky-600",
  },
  "Super Typhoon": {
    typeColor: "text-sky-600",
    tagColor: "bg-sky-100 text-sky-600",
  },

  // Hydrological Hazards
  "Storm Surge": {
    typeColor: "text-teal-600",
    tagColor: "bg-teal-100 text-teal-600",
  },
  Flood: {
    typeColor: "text-teal-500",
    tagColor: "bg-teal-100 text-teal-600",
  },
  Tsunami: {
    typeColor: "text-cyan-700",
    tagColor: "bg-cyan-100 text-cyan-700",
  },

  // Geological Hazards
  Earthquake: {
    typeColor: "text-red-600",
    tagColor: "bg-red-100 text-red-600",
  },
  "Volcanic Eruption": {
    typeColor: "text-orange-600",
    tagColor: "bg-orange-100 text-orange-600",
  },
  Landslide: {
    typeColor: "text-yellow-600",
    tagColor: "bg-yellow-100 text-yellow-600",
  },

  // Fallback
  Other: {
    typeColor: "text-gray-500",
    tagColor: "bg-gray-100 text-gray-600",
  },
};

export const getTypeColor = (type: string) =>
  DISASTER_TYPE_COLORS[type]?.typeColor ?? DISASTER_TYPE_COLORS["Other"].typeColor;

export const getTagColor = (type: string) =>
  DISASTER_TYPE_COLORS[type]?.tagColor ?? DISASTER_TYPE_COLORS["Other"].tagColor;
