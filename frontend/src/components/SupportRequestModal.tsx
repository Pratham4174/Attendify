import { ContactRequestForm } from "./ContactRequestForm";

export function SupportRequestModal({
  open,
  onClose,
  initialValues
}: {
  open: boolean;
  onClose: () => void;
  initialValues: {
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    companyName: string;
    employeeCount: string;
    message: string;
  };
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="image-modal-backdrop" onClick={onClose}>
      <div className="image-modal-card support-modal-card" onClick={(event) => event.stopPropagation()}>
        <button className="ghost-button image-modal-close" onClick={onClose} type="button">
          Close
        </button>
        <ContactRequestForm
          heading="Need help?"
          intro="Request onboarding help, a callback, or product support from inside Peeplify."
          initialValues={initialValues}
          submitLabel="Send request"
        />
      </div>
    </div>
  );
}
