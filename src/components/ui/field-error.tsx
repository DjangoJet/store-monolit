/** Komunikat błędu pod polem formularza. Renderuje się tylko gdy jest błąd. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}
