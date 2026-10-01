import { forwardRef } from "react";

export interface FormErrorItem {
  fieldId: string;
  label: string;
  message: string;
}

interface FormErrorSummaryProps {
  errors: FormErrorItem[];
  id: string;
  className?: string;
}

export const FormErrorSummary = forwardRef<HTMLElement, FormErrorSummaryProps>(
  function FormErrorSummary({ errors, id, className = "" }, ref) {
    if (errors.length === 0) return null;

    const headingId = `${id}-heading`;
    const guidanceId = `${id}-guidance`;

    return (
      <section
        id={id}
        ref={ref}
        tabIndex={-1}
        role="alert"
        aria-labelledby={headingId}
        aria-describedby={guidanceId}
        className={`rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
      >
        <p id={headingId} className="font-semibold">Votre formulaire contient des erreurs.</p>
        <p id={guidanceId} className="mt-1 text-muted-foreground">Corrigez les champs signalés, puis envoyez à nouveau.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {errors.map((error) => (
            <li key={error.fieldId}>
              <a
                href={`#${error.fieldId}`}
                className="underline underline-offset-2 hover:text-foreground"
                onClick={(event) => {
                  event.preventDefault();
                  document.getElementById(error.fieldId)?.focus();
                }}
              >
                {error.label}: {error.message}
              </a>
            </li>
          ))}
        </ul>
      </section>
    );
  },
);
