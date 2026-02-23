import { cn } from "@/lib/utils";

interface GoogleGIconProps {
  className?: string;
  size?: number;
  title?: string;
  decorative?: boolean;
}

export function GoogleGIcon({
  className,
  size = 18,
  title = "Google",
  decorative = true,
}: GoogleGIconProps) {
  const ariaProps = decorative
    ? { "aria-hidden": true }
    : { role: "img" as const, "aria-label": title };

  return (
    <svg
      {...ariaProps}
      className={cn("inline-block shrink-0", className)}
      width={size}
      height={size}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      {!decorative && <title>{title}</title>}
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6382-.0573-1.2518-.1636-1.8409H9v3.4818h4.8436c-.2086 1.125-.8427 2.0782-1.7964 2.7164v2.2582h2.9089c1.7027-1.5673 2.6839-3.8741 2.6839-6.6155Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.8059 5.9561-2.1791l-2.9089-2.2582c-.8059.54-1.8368.8591-3.0472.8591-2.3455 0-4.3323-1.5845-5.0409-3.7159H.9573v2.3327C2.4377 15.98 5.4818 18 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.9591 10.7059c-.18-.54-.2823-1.1168-.2823-1.7059s.1023-1.1659.2823-1.7059V4.9614H.9573C.3477 6.1768 0 7.5477 0 9s.3477 2.8232.9573 4.0386l3.0018-2.3327Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5782c1.3214 0 2.5078.4541 3.4405 1.3459l2.5806-2.5804C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4377 2.02.9573 4.9614l3.0018 2.3327C4.6677 5.1627 6.6545 3.5782 9 3.5782Z"
      />
    </svg>
  );
}

