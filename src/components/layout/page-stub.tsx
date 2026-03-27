interface PageStubProps {
  title: string;
}

/**
 * Reusable placeholder for unimplemented pages.
 * Per UI-SPEC.md: shows page name + "coming in a future update."
 */
export function PageStub({ title }: PageStubProps) {
  return (
    <div className="flex flex-col items-start gap-4">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="text-base text-muted-foreground">
        This section is coming in a future update.
      </p>
    </div>
  );
}
