export type ApiErrorDetail = {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
};

function humanizeField(value: string | number) {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function formatValidationDetails(details: ApiErrorDetail[]) {
  const messages = details
    .map((detail) => {
      const field = detail.loc?.filter((item) => item !== "body").at(-1);
      const label = field !== undefined ? `${humanizeField(field)}: ` : "";
      return detail.msg ? `${label}${detail.msg}` : "";
    })
    .filter(Boolean);

  return messages.length > 0
    ? messages.join(" • ")
    : "Please check the highlighted fields.";
}

export function normalizeErrorMessage(
  error: unknown,
  fallback = "Something went wrong",
) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

export function friendlyStatusMessage(status: number) {
  if (status === 400)
    return "The request needs a small fix before it can be saved.";
  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403) return "You do not have access to this item.";
  if (status === 404) return "That note or page could not be found.";
  if (status === 409) return "This conflicts with an existing record.";
  if (status === 422) return "Some fields need attention.";
  if (status === 429)
    return "Too many requests. Please wait a moment and try again.";
  if (status >= 500)
    return "The service is having trouble. Please retry in a moment.";
  return "Request failed.";
}
