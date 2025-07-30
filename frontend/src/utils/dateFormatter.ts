export const formatDate = (dateString?: string) => {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  return isNaN(date.getTime())
    ? "N/A"
    : new Intl.DateTimeFormat("en-PH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(date);
};