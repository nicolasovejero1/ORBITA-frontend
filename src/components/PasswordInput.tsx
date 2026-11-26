import { useState } from 'react';
import { AppIcon, Tappable } from '@/components/a11y';
import { FormTextInput } from '@/components/ds';
import { DS } from '@/constants/tokens';

/** Campo de contraseña con botón (ojo) para mostrarla u ocultarla, igual que en el login. */
export function PasswordInput({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  // Los formularios todavía pasan estas props del campo de Paper; ya no se usan.
  style?: unknown;
  outlineStyle?: unknown;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <FormTextInput
      accessibilityLabel={label}
      label={label}
      value={value}
      onChangeText={onChange}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      left={<AppIcon name="lock-closed-outline" size={22} color={DS.colors.textTertiary} />}
      right={
        <Tappable
          centrado
          onPress={() => setVisible((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          style={{ marginRight: -10 }}
        >
          <AppIcon name={visible ? 'eye-off-outline' : 'eye-outline'} size={22} color={DS.colors.textTertiary} />
        </Tappable>
      }
    />
  );
}
