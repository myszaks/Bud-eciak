import ConfirmDeleteModal from "./ConfirmDeleteModal";
import ConfirmDeleteBudgetModal from "./ConfirmDeleteBudgetModal";
import ChangePermissionModal from "./ChangePermissionModal";
import NewBudgetModal from "./NewBudgetModal";

export default function ModalRoot({ type, props, onClose }) {
  switch (type) {
    case "confirmDelete":
      return <ConfirmDeleteModal {...props} onClose={onClose} />;

    case "confirmDeleteBudget":
      return <ConfirmDeleteBudgetModal {...props} onClose={onClose} />;

    case "changePermission":
      return <ChangePermissionModal {...props} onClose={onClose} />;

    case "newBudget":
      return <NewBudgetModal {...props} onClose={onClose} />;

    default:
      return null;
  }
}
