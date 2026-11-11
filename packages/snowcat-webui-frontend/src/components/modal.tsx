import { Button } from '@heroui/button';
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Modal as NextUIModal,
  useDisclosure,
} from '@heroui/modal';
import React from 'react';

export interface ModalProps {
  content: React.ReactNode;
  title?: React.ReactNode;
  size?: React.ComponentProps<typeof NextUIModal>['size'];
  scrollBehavior?: React.ComponentProps<typeof NextUIModal>['scrollBehavior'];
  onClose?: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  backdrop?: 'opaque' | 'blur' | 'transparent';
  showCancel?: boolean;
  dismissible?: boolean;
  confirmText?: string;
  cancelText?: string;
  hideFooter?: boolean;
}

const Modal: React.FC<ModalProps> = React.memo((props) => {
  const {
    backdrop = 'blur',
    title,
    content,
    showCancel = true,
    dismissible,
    confirmText = '确定',
    cancelText = '取消',
    hideFooter = false,
    onClose,
    onConfirm,
    onCancel,
    ...rest
  } = props;
  const { onClose: onNativeClose } = useDisclosure();

  return (
    <NextUIModal
      defaultOpen
      backdrop={backdrop}
      isDismissable={dismissible}
      onClose={() => {
        onClose?.();
        onNativeClose();
      }}
      classNames={{
        backdrop: 'z-[99] backdrop-blur-sm',
        wrapper: 'z-[99]',
      }}
      {...rest}
    >
      <ModalContent className='rounded-3xl border border-white/70 dark:border-white/10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl shadow-2xl shadow-primary-900/10'>
        {(nativeClose) => (
          <>
            {title && (
              <ModalHeader className='flex flex-col gap-1 text-lg font-semibold'>{title}</ModalHeader>
            )}
            <ModalBody className='break-all'>{content}</ModalBody>
            {!hideFooter && (
              <ModalFooter>
                {showCancel && (
                  <Button
                    color='primary'
                    variant='light'
                    onPress={() => {
                      onCancel?.();
                      nativeClose();
                    }}
                  >
                    {cancelText}
                  </Button>
                )}
                <Button
                  color='primary'
                  onPress={() => {
                    onConfirm?.();
                    nativeClose();
                  }}
                >
                  {confirmText}
                </Button>
              </ModalFooter>
            )}
          </>
        )}
      </ModalContent>
    </NextUIModal>
  );
});

Modal.displayName = 'Modal';

export default Modal;
