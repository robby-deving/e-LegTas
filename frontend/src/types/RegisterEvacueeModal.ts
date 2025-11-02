export type RegisterEvacueeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode: "register" | "edit";
  formData: any;
  onFormChange: (field: string, value: string) => void;
  onVulnerabilityChange: (field: string, value: boolean) => void;
  onSave: (opts?: { shouldHideRoom: boolean }) => void | Promise<void>;
  onFamilyHeadSearch: () => void;
  centerId: number;
  canCreateFamilyInformation?: boolean;
  hideRoomField?: boolean;
  isPrivateHouse?: boolean; 
};

