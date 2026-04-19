import { PageHeader } from "@/components/PageHeader";

interface PlaceholderProps {
  title: string;
  description: string;
  step: string;
}

const Placeholder = ({ title, description, step }: PlaceholderProps) => (
  <div>
    <PageHeader title={title} description={description} />
    <div className="px-6 py-6">
      <div className="surface-card p-8 text-center">
        <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs text-warning">
          <span className="h-1.5 w-1.5 rounded-full bg-warning" />
          Coming in {step}
        </div>
        <h2 className="text-base font-semibold">This page is wired in Step 1</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          The route, layout, and access control are in place. The interactive
          functionality lands in the next step.
        </p>
      </div>
    </div>
  </div>
);

export default Placeholder;
