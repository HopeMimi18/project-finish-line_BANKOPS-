import { PageHeader } from "@/components/PageHeader";
import { ScopedAccessPrototype } from "@/components/ScopedAccessPrototype";

const AccessRequests = () => {
  return (
    <div>
      <PageHeader
        title="Access Requests"
        description="Request, scope and certify data access — managers approve with a dedicated view, an expiry date and masking."
      />
      <div className="p-6">
        <ScopedAccessPrototype />
      </div>
    </div>
  );
};

export default AccessRequests;
