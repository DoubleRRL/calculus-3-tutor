/** Transparent full-screen catcher — click outside a float panel to close it. */
export function FloatDismissBackdrop({
  onDismiss,
  label = "Close panel",
}: {
  onDismiss: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="pointer-events-auto absolute inset-0 z-0"
      onClick={onDismiss}
    />
  );
}
