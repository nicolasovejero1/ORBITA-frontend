import { AccessibilityInfo } from 'react-native';

/** Hace que TalkBack / VoiceOver lea un mensaje sin mover el foco (carga terminada, error, acción hecha). */
export function announce(mensaje: string): void {
  AccessibilityInfo.announceForAccessibility(mensaje);
}
