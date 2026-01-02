import { createContext, useContext, useState } from "react";
import ModalPortal from "../components/ModalPortal";
import ModalRoot from "../components/modals/ModalRoot";

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
  const [modal, setModal] = useState(null);

  const openModal = (type, props = {}) => {
    setModal({ type, props });
  };

  const closeModal = () => {
    setModal(null);
  };

  return (
    <ModalContext.Provider value={{ openModal, closeModal }}>
      {children}

      {modal && (
        <ModalPortal>
          <ModalRoot
            type={modal.type}
            props={modal.props}
            onClose={closeModal}
          />
        </ModalPortal>
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error("useModal must be used inside ModalProvider");
  }
  return ctx;
}
