import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { DS } from '@/constants/tokens';
import { AppIcon, Tappable } from '@/components/a11y';

type Variant = 'danger' | 'primary' | 'warning';

const VARIANTS: Record<Variant, { icon: keyof typeof Ionicons.glyphMap; iconColor: string; iconBg: string; okBg: string }> = {
  danger: { icon: 'trash-outline', iconColor: DS.colors.error, iconBg: DS.colors.errorSoft, okBg: DS.colors.error },
  primary: { icon: 'help-circle-outline', iconColor: DS.colors.accent, iconBg: DS.colors.accentSoft, okBg: DS.colors.primary },
  warning: { icon: 'warning-outline', iconColor: DS.colors.warning, iconBg: DS.colors.warningSoft, okBg: DS.colors.error },
};

/**
 * Ventana de confirmación centrada. Reemplaza a `Alert.alert` (que se ve como un
 * mensaje del sistema operativo) y a las barras de confirmación que aparecían
 * al final de la pantalla. `children` permite sumar un campo (por ejemplo,
 * el motivo de cancelación).
 */
export function ConfirmDialog({
  visible, title, message, confirmLabel, cancelLabel = 'Volver',
  variant = 'primary', icon, loading = false, onConfirm, onCancel, children,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const v = VARIANTS[variant];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card} accessibilityViewIsModal accessible={false}>
          <View style={[styles.iconWrap, { backgroundColor: v.iconBg }]}>
            <AppIcon name={icon ?? v.icon} size={30} color={v.iconColor} />
          </View>
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {children}
          <View style={styles.actions}>
            <Tappable
              centrado
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel}
            >
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Tappable>
            <Tappable
              centrado
              style={[styles.okBtn, { backgroundColor: v.okBg }, loading && styles.disabled]}
              onPress={onConfirm}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel={loading ? 'Procesando' : confirmLabel}
            >
              <Text style={styles.okText}>{loading ? 'Procesando...' : confirmLabel}</Text>
            </Tappable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: DS.space.screen,
  },
  card: {
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.featured, padding: 24,
    width: '100%', maxWidth: 360, alignItems: 'center', gap: 10,
    borderWidth: DS.border, borderColor: DS.colors.border,
  },
  iconWrap: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  title: { fontFamily: DS.font.bold, fontSize: 20, lineHeight: 26, color: DS.colors.text, textAlign: 'center' },
  message: { fontFamily: DS.font.regular, fontSize: 15, lineHeight: 22, color: DS.colors.textSecondary, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10, width: '100%' },
  cancelBtn: {
    flex: 1, minHeight: 50, borderRadius: DS.radius.control,
    borderWidth: DS.border, borderColor: DS.colors.border, backgroundColor: DS.colors.surface,
  },
  cancelText: { fontFamily: DS.font.semibold, fontSize: 16, color: DS.colors.text },
  okBtn: { flex: 1, minHeight: 50, borderRadius: DS.radius.control },
  okText: { fontFamily: DS.font.semibold, fontSize: 16, color: DS.colors.onPrimary },
  disabled: { opacity: 0.7 },
});
