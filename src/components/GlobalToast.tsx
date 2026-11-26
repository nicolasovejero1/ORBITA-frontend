import { Toast } from '@/components/Toast';
import { useToastStore } from '@/store/toast.store';

export function GlobalToast() {
  const { message, type, hide } = useToastStore();

  return <Toast visible={!!message} message={message ?? ''} type={type} onClose={hide} style={{ bottom: 96 }} />;
}
