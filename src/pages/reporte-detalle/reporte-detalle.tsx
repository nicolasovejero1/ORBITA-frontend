import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Switch } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reportesApi } from '@/api/reportes';
import { usuariosApi } from '@/api/usuarios';
import { BASE_URL } from '@/constants/api';
import { DS } from '@/constants/tokens';
import { AvatarRing, Button, Card, Chip, DataRow, Input, OrbitDecor, ScreenHeader } from '@/components/ds';
import { Skeleton } from '@/components/Skeleton';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Toast, useToast } from '@/components/Toast';
import { useAuthStore } from '@/store/auth.store';
import { Reporte, ReporteAdjunto, TipoAdjunto, TipoReporte } from '@/types/reporte.types';
import { UsuarioListItem } from '@/types/usuario.types';
import { formatFechaLocal } from '@/utils/date';
import { getErrorMessage } from '@/utils/http-error';
import { volver } from '@/utils/navegacion';
import { buscar, MIN_LETRAS_BUSQUEDA } from '@/utils/search';
import { AppIcon, AppTextInput, Tappable } from '@/components/a11y';

export default function ReporteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { toast, showToast, hideToast } = useToast();

  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState<'info' | 'adjuntos' | 'colaboradores'>('info');
  const [visibilidadTutorLocal, setVisibilidadTutorLocal] = useState(false);

  
  const [editMode, setEditMode] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);

  
  const [adjuntoPath, setAdjuntoPath] = useState('');

  
  const [profesionales, setProfesionales] = useState<UsuarioListItem[]>([]);
  const [profOpen, setProfOpen] = useState(false);
  const [profSearch, setProfSearch] = useState('');
  const [selectedProf, setSelectedProf] = useState<UsuarioListItem | null>(null);

  
  const [discardConfirmVisible, setDiscardConfirmVisible] = useState(false);
  const [guardarConfirm, setGuardarConfirm] = useState(false);

  
  const [cerrarConfirm, setCerrarConfirm] = useState(false);
  const [eliminarConfirm, setEliminarConfirm] = useState(false);
  const [eliminarAdjuntoTarget, setEliminarAdjuntoTarget] = useState<number | null>(null);
  const [subiendoTipo, setSubiendoTipo] = useState<'imagen' | 'pdf' | null>(null);
  const [revocarTarget, setRevocarTarget] = useState<{ id: number; nombre: string } | null>(null);

  // Solo el creador gestiona el reporte, tenga o no permisos de administrador
  // (mismo criterio que en actividades). Mientras está EN_CURSO puede editarlo,
  // finalizarlo, borrarlo y adjuntar; los colaboradores se gestionan siempre,
  // también con el reporte finalizado, porque solo lo leen.
  const isCreador = reporte?.profesionalId === user?.id;
  const canEdit = isCreador && reporte?.estado !== 'FINALIZADO';
  const canManage = isCreador && reporte?.estado !== 'FINALIZADO';

  const cargar = async () => {
    setLoadError(false);
    try {
      const r = await reportesApi.getOne(Number(id));
      setReporte(r);
      setTitulo(r.titulo);
      setDescripcion(r.descripcionDetallada ?? '');
      setVisibilidadTutorLocal(r.visibilidadTutor);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [id]);

  useEffect(() => {
    if (tab === 'colaboradores' && isCreador) {
      usuariosApi.getAll('PROFESIONAL').then(setProfesionales).catch(() => {});
    }
  }, [tab, isCreador]);

  
  useFocusEffect(
    useCallback(() => {
      const handler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (editMode) {
          setDiscardConfirmVisible(true);
          return true;
        }
        return false;
      });
      return () => handler.remove();
    }, [editMode]),
  );

  const guardarEdicion = async () => {
    setGuardarConfirm(false);
    setSaving(true);
    try {
      const updated = await reportesApi.update(Number(id), {
        titulo: titulo.trim() || undefined,
        descripcionDetallada: descripcion.trim() || undefined,
      });
      setReporte(updated);
      setEditMode(false);
      showToast('Reporte actualizado correctamente', 'success');
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo guardar'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const descartarEdicion = () => {
    if (reporte) {
      setTitulo(reporte.titulo);
      setDescripcion(reporte.descripcionDetallada ?? '');
    }
    setEditMode(false);
    setDiscardConfirmVisible(false);
    volver(router, '/(app)/reportes');
  };

  const finalizar = async () => {
    setCerrarConfirm(false);
    try {
      const updated = await reportesApi.changeEstado(Number(id), {
        estado: 'FINALIZADO',
        visibilidadTutor: visibilidadTutorLocal,
      });
      setReporte(updated);
      showToast('Reporte finalizado correctamente', 'success');
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo actualizar el estado'), 'error');
    }
  };

  const eliminar = async () => {
    setEliminarConfirm(false);
    try {
      await reportesApi.remove(Number(id));
      volver(router, '/(app)/reportes');
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo eliminar el reporte'), 'error');
    }
  };

  const agregarAdjunto = async () => {
    const enlace = adjuntoPath.trim();
    if (!/^https?:\/\/\S+$/i.test(enlace)) return showToast('Ingresá un enlace que empiece con http:// o https://', 'error');
    try {
      await reportesApi.addAdjunto(Number(id), enlace);
      setAdjuntoPath('');
      cargar();
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo agregar el adjunto'), 'error');
    }
  };

  const subirImagen = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') return showToast('Necesitamos acceso a tus fotos', 'error');
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (res.canceled || res.assets.length === 0) return;
      const a = res.assets[0];
      setSubiendoTipo('imagen');
      await reportesApi.uploadAdjunto(Number(id), {
        uri: a.uri,
        name: a.fileName ?? 'foto.jpg',
        type: a.mimeType ?? 'image/jpeg',
        // En web, expo-image-picker devuelve el Blob real en `.file` (igual que
        // expo-document-picker); sin esto, FormData.append en el navegador manda
        // el objeto {uri,name,type} como texto en vez de un archivo real, y el
        // backend responde "File is required".
        file: (a as any).file,
      });
      showToast('Foto subida correctamente', 'success');
      cargar();
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo subir la foto'), 'error');
    } finally {
      setSubiendoTipo(null);
    }
  };

  const subirPdf = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || res.assets.length === 0) return;
      const a = res.assets[0];
      setSubiendoTipo('pdf');
      await reportesApi.uploadAdjunto(Number(id), {
        uri: a.uri,
        name: a.name,
        type: a.mimeType ?? 'application/pdf',
        file: (a as any).file,
      });
      showToast('PDF subido correctamente', 'success');
      cargar();
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo subir el PDF'), 'error');
    } finally {
      setSubiendoTipo(null);
    }
  };

  const abrirAdjunto = async (adj: ReporteAdjunto) => {
    // Los archivos subidos ya no son públicos: el backend entrega un enlace
    // firmado que dura 60 s (los enlaces externos vuelven tal cual).
    try {
      const { url, externo } = await reportesApi.getUrlAdjunto(Number(id), adj.id);
      await Linking.openURL(externo ? url : `${BASE_URL}${url}`);
    } catch {
      showToast('No se pudo abrir el adjunto', 'error');
    }
  };

  const confirmarEliminarAdjunto = async (adjuntoId: number) => {
    setEliminarAdjuntoTarget(null);
    try {
      await reportesApi.removeAdjunto(Number(id), adjuntoId);
      cargar();
    } catch {
      showToast('No se pudo eliminar el adjunto', 'error');
    }
  };

  const agregarColaborador = async () => {
    if (!selectedProf) return showToast('Seleccioná un profesional', 'error');
    try {
      await reportesApi.addColaborador(Number(id), selectedProf.id);
      setSelectedProf(null);
      setProfOpen(false);
      setProfSearch('');
      cargar();
    } catch (e: any) {
      showToast(getErrorMessage(e, 'No se pudo agregar el colaborador'), 'error');
    }
  };

  const confirmarRevocar = async () => {
    if (!revocarTarget) return;
    const profId = revocarTarget.id;
    setRevocarTarget(null);
    try {
      await reportesApi.removeColaborador(Number(id), profId);
      cargar();
    } catch {
      showToast('No se pudo revocar el acceso', 'error');
    }
  };

  if (loading) {
    return (
      <View style={rep.container}>
        <View style={rep.skeleton}>
          <Skeleton height={200} borderRadius={DS.radius.featured} />
          <Skeleton height={86} borderRadius={DS.radius.card} />
          <Skeleton height={52} borderRadius={DS.radius.control} />
          <Skeleton height={200} borderRadius={DS.radius.card} />
        </View>
      </View>
    );
  }

  if (loadError || !reporte) {
    return (
      <View style={rep.container}>
        <ScreenHeader titulo="Reporte" onVolver={() => volver(router, '/(app)/reportes')} volverLabel="Volver a Reportes" />
        <View style={rep.centro}>
          <View style={rep.vacioIcono}><AppIcon name="alert-circle-outline" size={32} color={DS.colors.textTertiary} /></View>
          <Text style={rep.vacioTexto}>No se pudo cargar el reporte</Text>
          <Button label="Reintentar" variant="secondary" height={48} onPress={cargar} accessibilityLabel="Reintentar cargar el reporte" />
        </View>
      </View>
    );
  }

  const finalizado = reporte.estado === 'FINALIZADO';
  const tipo = TIPO_VISUAL_REPORTE[reporte.tipo];
  const autor = `${reporte.profesional.usuario.nombre} ${reporte.profesional.usuario.apellido}`;
  const creado = new Date(reporte.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '');
  const volverAtras = () => (editMode ? setDiscardConfirmVisible(true) : volver(router, '/(app)/reportes'));

  return (
    <View style={rep.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={rep.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={rep.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Card dark featured style={[rep.hero, { paddingTop: insets.top + 14 }]}>
            <OrbitDecor />
            <View style={rep.heroTop}>
              <Tappable
                centrado
                onPress={volverAtras}
                accessibilityRole="button"
                accessibilityLabel={editMode ? 'Volver y descartar los cambios' : 'Volver a Reportes'}
                style={rep.volver}
              >
                <AppIcon name="chevron-back" size={22} color={DS.colors.onPrimary} />
              </Tappable>
              <Chip label={finalizado ? 'Finalizado' : 'En curso'} tone={finalizado ? 'success' : 'warning'} />
            </View>

            <View style={[rep.heroIcono, { backgroundColor: tipo.bg }]}>
              <AppIcon name={tipo.icon} size={32} color={tipo.fg} />
            </View>
            <Text style={rep.heroTitulo} accessibilityRole="header">{reporte.titulo}</Text>
            <View style={rep.heroActividad}>
              <AppIcon name="clipboard-outline" size={16} color={DS.colors.onPrimaryMuted} />
              <Text style={rep.heroActividadTexto} numberOfLines={1}>{reporte.actividad.titulo}</Text>
            </View>
            <View style={rep.heroChips}>
              <Chip label={tipo.label} tone="accent" />
              {reporte.visibilidadTutor && <Chip label="Visible a tutores" tone="neutral" />}
            </View>
          </Card>

          <View style={rep.datos}>
            <View style={rep.dato3}>
              <AppIcon name="calendar-outline" size={22} color={DS.colors.accent} />
              <Text style={rep.dato3Valor} numberOfLines={1}>{creado}</Text>
              <Text style={rep.dato3Label}>Creado</Text>
            </View>
            <View style={rep.dato3}>
              <AppIcon name="attach" size={22} color={DS.colors.accent} />
              <Text style={rep.dato3Valor}>{reporte.adjuntos.length}</Text>
              <Text style={rep.dato3Label}>Adjuntos</Text>
            </View>
            <View style={rep.dato3}>
              <AppIcon name="people-outline" size={22} color={DS.colors.accent} />
              <Text style={rep.dato3Valor}>{reporte.colaboradores.length}</Text>
              <Text style={rep.dato3Label}>Colaboradores</Text>
            </View>
          </View>

          <View style={rep.segmentado} accessibilityRole="tablist">
            {(['info', 'adjuntos', 'colaboradores'] as const).map((t) => (
              <Tappable
                centrado
                key={t}
                accessibilityRole="tab"
                accessibilityLabel={t === 'info' ? 'Información' : t === 'adjuntos' ? `Adjuntos, ${reporte.adjuntos.length}` : `Colaboradores, ${reporte.colaboradores.length}`}
                selected={tab === t}
                style={[rep.segmento, tab === t && rep.segmentoActivo]}
                onPress={() => setTab(t)}
              >
                <Text style={[rep.segmentoTexto, tab === t && rep.segmentoTextoActivo]} numberOfLines={1}>
                  {t === 'info' ? 'Info' : t === 'adjuntos' ? 'Adjuntos' : 'Colaboradores'}
                </Text>
              </Tappable>
            ))}
          </View>

          {tab === 'info' && (
            <>
              {editMode ? (
                <View>
                  <Text style={rep.seccion} accessibilityRole="header">Editar reporte</Text>
                  <Card style={rep.cardForm}>
                    <Input label="Título" accessibilityLabel="Título" value={titulo} onChangeText={setTitulo} />
                    <Text style={rep.campoLabel}>Descripción</Text>
                    <AppTextInput
                      accessibilityLabel="Descripción"
                      value={descripcion}
                      onChangeText={setDescripcion}
                      multiline
                      numberOfLines={8}
                      textAlignVertical="top"
                      style={rep.textarea}
                    />
                    <View style={rep.filaBotones}>
                      <View style={rep.flex}><Button label="Cancelar" variant="secondary" height={50} onPress={() => setEditMode(false)} accessibilityLabel="Cancelar la edición" /></View>
                      <View style={rep.flex}><Button label="Guardar" height={50} loading={saving} onPress={() => setGuardarConfirm(true)} accessibilityLabel="Guardar cambios" /></View>
                    </View>
                  </Card>
                </View>
              ) : (
                <>
                  <View>
                    <Text style={rep.seccion} accessibilityRole="header">Detalles</Text>
                    <Card style={rep.card}>
                      <DataRow icon="pricetag-outline" tone="indigo" label="Tipo" value={tipo.label} />
                      <DataRow icon="person-circle-outline" tone="rosa" label="Creado por" value={autor} />
                      <DataRow icon="clipboard-outline" tone="teal" label="Actividad" value={reporte.actividad.titulo} />
                      {reporte.instancia && (
                        <DataRow icon="time-outline" tone="ambar" label="Sesión" value={formatFechaLocal(reporte.instancia.fechaProgramada)} />
                      )}
                      <DataRow icon="calendar-outline" tone="indigo" label="Creado" value={new Date(reporte.createdAt).toLocaleDateString('es-AR')} last />
                    </Card>
                  </View>

                  {reporte.descripcionDetallada ? (
                    <View>
                      <Text style={rep.seccion} accessibilityRole="header">Descripción</Text>
                      <Card style={rep.cardTexto}>
                        <Text style={rep.descripcion}>{reporte.descripcionDetallada}</Text>
                      </Card>
                    </View>
                  ) : null}

                  {canManage && (
                    <Card style={rep.visibilidad}>
                      <View style={[rep.visIcono, { backgroundColor: '#EEF2FF' }]}>
                        <AppIcon name="eye-outline" size={22} color={DS.colors.accent} />
                      </View>
                      <View style={rep.flex}>
                        <Text style={rep.visTitulo} accessibilityRole="header">Visible para el PCD y sus tutores</Text>
                        <Text style={rep.visTexto}>Lo van a poder ver una vez que lo finalices</Text>
                      </View>
                      <Switch
                        value={visibilidadTutorLocal}
                        onValueChange={setVisibilidadTutorLocal}
                        color={DS.colors.primary}
                        accessibilityLabel="Visible para el PCD y sus tutores al finalizar"
                      />
                    </Card>
                  )}

                  {(canManage || canEdit) && (
                    <View style={rep.acciones}>
                      {canManage && <Button label="Finalizar reporte" onPress={() => setCerrarConfirm(true)} />}
                      {canEdit && <Button label="Editar reporte" variant="secondary" onPress={() => setEditMode(true)} />}
                      {canManage && (
                        <Tappable
                          centrado
                          style={rep.eliminar}
                          onPress={() => setEliminarConfirm(true)}
                          accessibilityRole="button"
                          accessibilityLabel="Eliminar reporte"
                        >
                          <AppIcon name="trash-outline" size={20} color={DS.colors.error} />
                          <Text style={rep.eliminarTexto}>Eliminar reporte</Text>
                        </Tappable>
                      )}
                    </View>
                  )}
                </>
              )}
            </>
          )}

          {tab === 'adjuntos' && (
            <>
              {canManage && (
                <View style={rep.subir}>
                  <Tappable hitSlop={HIT_BTN} centrado style={rep.subirBtn} onPress={subirImagen} disabled={subiendoTipo !== null} accessibilityRole="button" accessibilityLabel="Subir foto">
                    {subiendoTipo === 'imagen'
                      ? <ActivityIndicator accessibilityLabel="Cargando" color={DS.colors.accent} size="small" />
                      : <AppIcon name="camera-outline" size={24} color={DS.colors.accent} />}
                    <Text style={rep.subirTexto}>Subir foto</Text>
                  </Tappable>
                  <Tappable hitSlop={HIT_BTN} centrado style={rep.subirBtn} onPress={subirPdf} disabled={subiendoTipo !== null} accessibilityRole="button" accessibilityLabel="Subir PDF">
                    {subiendoTipo === 'pdf'
                      ? <ActivityIndicator accessibilityLabel="Cargando" color={DS.colors.accent} size="small" />
                      : <AppIcon name="document-outline" size={24} color={DS.colors.accent} />}
                    <Text style={rep.subirTexto}>Subir PDF</Text>
                  </Tappable>
                </View>
              )}

              {reporte.adjuntos.length > 0 && (
                <View style={rep.lista}>
                  {reporte.adjuntos.map((adj) => {
                    const v = ADJUNTO_VISUAL[adj.tipoArchivo];
                    return (
                      <Card key={adj.id} style={rep.adjunto}>
                        <Tappable
                          accessibilityRole="link"
                          accessibilityLabel={`Abrir adjunto ${adj.tipoArchivo.toLowerCase()}: ${adj.filePath}`}
                          style={rep.adjuntoLink}
                          onPress={() => abrirAdjunto(adj)}
                          activeOpacity={0.7}
                        >
                          <View style={[rep.adjuntoIcono, { backgroundColor: v.bg }]}>
                            <AppIcon name={v.icon} size={22} color={v.fg} />
                          </View>
                          <View style={rep.flex}>
                            <Text style={rep.adjuntoTipo}>{v.label}</Text>
                            <Text style={rep.adjuntoRuta} numberOfLines={1}>{adj.filePath}</Text>
                          </View>
                        </Tappable>
                        {canManage && (
                          <Tappable centrado style={rep.iconBtn} accessibilityRole="button" accessibilityLabel="Eliminar adjunto" onPress={() => setEliminarAdjuntoTarget(adj.id)}>
                            <AppIcon name="trash-outline" size={22} color={DS.colors.error} />
                          </Tappable>
                        )}
                      </Card>
                    );
                  })}
                </View>
              )}

              {reporte.adjuntos.length === 0 && (
                <View style={rep.vacio}>
                  <View style={rep.vacioIcono}><AppIcon name="attach-outline" size={32} color={DS.colors.textTertiary} /></View>
                  <Text style={rep.vacioTexto}>Sin adjuntos</Text>
                </View>
              )}

              {canManage && (
                <View>
                  <Text style={rep.seccion} accessibilityRole="header">Agregar enlace</Text>
                  <Card style={rep.cardForm}>
                    <Input
                      label="Enlace"
                      accessibilityLabel="Enlace del adjunto"
                      placeholder="https://..."
                      value={adjuntoPath}
                      onChangeText={setAdjuntoPath}
                      autoCapitalize="none"
                      keyboardType="url"
                      left={<AppIcon name="link-outline" size={22} color={DS.colors.textTertiary} />}
                    />
                    <Button label="Agregar enlace" onPress={agregarAdjunto} />
                  </Card>
                </View>
              )}
            </>
          )}

          {tab === 'colaboradores' && (
            <>
              {isCreador && (
                <View>
                  <Text style={rep.seccion} accessibilityRole="header">Agregar colaborador</Text>
                  <Card style={rep.cardForm}>
                    <Text style={rep.pista}>
                      Los colaboradores pueden ver el reporte, pero no modificarlo. Se pueden sumar en cualquier momento, también con el reporte finalizado.
                    </Text>
                    {selectedProf ? (
                      <View style={rep.elegido}>
                        <AppIcon name="person-outline" size={18} color={DS.colors.accent} />
                        <Text style={rep.elegidoTexto} numberOfLines={1}>{selectedProf.nombre} {selectedProf.apellido}</Text>
                        <Tappable centrado onPress={() => setSelectedProf(null)} accessibilityRole="button" accessibilityLabel="Quitar selección">
                          <AppIcon name="close-circle" size={22} color={DS.colors.accent} />
                        </Tappable>
                      </View>
                    ) : (
                      <View style={rep.buscador}>
                        <AppIcon name="search-outline" size={20} color={DS.colors.textTertiary} />
                        <AppTextInput
                          accessibilityLabel="Buscar profesional por nombre"
                          placeholder="Buscar profesional por nombre..."
                          placeholderTextColor={DS.colors.textTertiary}
                          value={profSearch}
                          onChangeText={(t) => { setProfSearch(t); setProfOpen(true); }}
                          onFocus={() => setProfOpen(true)}
                          style={rep.buscadorInput}
                        />
                      </View>
                    )}
                    {profOpen && !selectedProf && (() => {
                      const disponibles = profesionales.filter(
                        (p) => p.id !== user?.id && !reporte.colaboradores.some((c) => c.profesionalId === p.id),
                      );
                      const res = buscar(disponibles, profSearch, (p) => `${p.nombre} ${p.apellido}`);
                      return (
                        <View style={rep.dropdown}>
                          {res.faltanLetras ? (
                            <Text style={rep.dropdownPista}>Escribí al menos {MIN_LETRAS_BUSQUEDA} letras del nombre</Text>
                          ) : res.visibles.length === 0 ? (
                            <Text style={rep.dropdownPista}>Sin resultados</Text>
                          ) : res.visibles.map((p) => (
                            <Tappable
                              accessibilityRole="button"
                              accessibilityLabel={`${p.nombre} ${p.apellido}`}
                              key={p.id}
                              style={rep.dropdownItem}
                              onPress={() => { setSelectedProf(p); setProfOpen(false); setProfSearch(''); }}
                            >
                              <Text style={rep.dropdownNombre}>{p.nombre} {p.apellido}</Text>
                              {p.profesional && <Text style={rep.dropdownSub}>{p.profesional.especialidad?.nombre}</Text>}
                            </Tappable>
                          ))}
                          {res.hayMas && (
                            <Text style={rep.dropdownPista}>Hay más resultados. Escribí más para afinar la búsqueda.</Text>
                          )}
                        </View>
                      );
                    })()}
                    <Button label="Agregar colaborador" disabled={!selectedProf} onPress={agregarColaborador} />
                  </Card>
                </View>
              )}

              {reporte.colaboradores.length > 0 && (
                <View style={rep.lista}>
                  {reporte.colaboradores.map((col) => {
                    const nombre = `${col.profesional.usuario.nombre} ${col.profesional.usuario.apellido}`;
                    return (
                      <Card key={col.profesionalId} style={rep.adjunto}>
                        <View style={rep.adjuntoLink}>
                          <AvatarRing initials={`${col.profesional.usuario.nombre[0]}${col.profesional.usuario.apellido[0]}`.toUpperCase()} size={44} />
                          <Text style={[rep.adjuntoTipo, rep.flex]} numberOfLines={1}>{nombre}</Text>
                        </View>
                        {isCreador && (
                          <Tappable
                            centrado
                            style={rep.iconBtn}
                            accessibilityRole="button"
                            accessibilityLabel={`Quitar a ${nombre}`}
                            onPress={() => setRevocarTarget({ id: col.profesionalId, nombre })}
                          >
                            <AppIcon name="person-remove-outline" size={22} color={DS.colors.error} />
                          </Tappable>
                        )}
                      </Card>
                    );
                  })}
                </View>
              )}

              {reporte.colaboradores.length === 0 && (
                <View style={rep.vacio}>
                  <View style={rep.vacioIcono}><AppIcon name="people-outline" size={32} color={DS.colors.textTertiary} /></View>
                  <Text style={rep.vacioTexto}>Sin colaboradores</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={guardarConfirm}
        title="¿Guardar los cambios?"
        icon="save-outline"
        confirmLabel="Guardar"
        onCancel={() => setGuardarConfirm(false)}
        onConfirm={guardarEdicion}
      />
      <ConfirmDialog
        visible={discardConfirmVisible}
        variant="warning"
        title="¿Descartar los cambios?"
        message="Si volvés atrás, los cambios sin guardar se pierden."
        cancelLabel="Seguir editando"
        confirmLabel="Descartar"
        onCancel={() => setDiscardConfirmVisible(false)}
        onConfirm={descartarEdicion}
      />
      <ConfirmDialog
        visible={cerrarConfirm}
        title="¿Finalizar el reporte?"
        message={`Después no se podrá modificar ni borrar.${visibilidadTutorLocal ? ' Lo van a ver el PCD y sus tutores.' : ''}`}
        icon="flag-outline"
        confirmLabel="Finalizar"
        onCancel={() => setCerrarConfirm(false)}
        onConfirm={finalizar}
      />
      <ConfirmDialog
        visible={eliminarConfirm}
        variant="danger"
        title="¿Eliminar el reporte?"
        message="Se eliminan el reporte y sus adjuntos. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onCancel={() => setEliminarConfirm(false)}
        onConfirm={eliminar}
      />
      <ConfirmDialog
        visible={eliminarAdjuntoTarget !== null}
        variant="danger"
        title="¿Eliminar el adjunto?"
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onCancel={() => setEliminarAdjuntoTarget(null)}
        onConfirm={() => { if (eliminarAdjuntoTarget !== null) void confirmarEliminarAdjunto(eliminarAdjuntoTarget); }}
      />
      <ConfirmDialog
        visible={revocarTarget !== null}
        variant="danger"
        icon="person-remove-outline"
        title="¿Quitar al colaborador?"
        message={revocarTarget ? `${revocarTarget.nombre} ya no va a poder ver el reporte.` : undefined}
        confirmLabel="Quitar"
        onCancel={() => setRevocarTarget(null)}
        onConfirm={confirmarRevocar}
      />

      <Toast {...toast} onClose={hideToast} />
    </View>
  );
}

// 40 dp visibles + 4 dp de hitSlop arriba y abajo = área táctil de 48 dp.
const HIT_BTN = { top: 4, bottom: 4, left: 4, right: 4 };

const TIPO_VISUAL_REPORTE: Record<TipoReporte, { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }> = {
  DE_ACTIVIDAD: { label: 'De actividad', icon: 'clipboard-outline', bg: '#EEF2FF', fg: '#4338CA' },
  MENSUAL: { label: 'Mensual', icon: 'calendar-outline', bg: '#CCFBF1', fg: '#0F766E' },
  FINAL: { label: 'Final', icon: 'flag-outline', bg: '#FCE7F3', fg: '#BE185D' },
};

const ADJUNTO_VISUAL: Record<TipoAdjunto, { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }> = {
  PDF: { label: 'PDF', icon: 'document-outline', bg: '#FCE7F3', fg: '#BE185D' },
  IMAGEN: { label: 'Imagen', icon: 'image-outline', bg: '#CCFBF1', fg: '#0F766E' },
  URL: { label: 'Enlace', icon: 'link-outline', bg: '#EEF2FF', fg: '#4338CA' },
};

/** Estilos de la pantalla de detalle de reporte. */
const rep = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: DS.colors.background },
  scroll: { paddingBottom: 56, gap: DS.space.section },
  skeleton: { padding: DS.space.screen, paddingTop: 64, gap: 16 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },

  hero: {
    borderRadius: 0, borderBottomLeftRadius: DS.radius.featured + 6, borderBottomRightRadius: DS.radius.featured + 6,
    paddingHorizontal: DS.space.screen, paddingBottom: 24, alignItems: 'center', gap: 10, overflow: 'hidden',
  },
  heroTop: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  volver: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.12)' },
  heroIcono: { width: 68, height: 68, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  heroTitulo: { fontFamily: DS.font.bold, fontSize: 24, lineHeight: 30, color: DS.colors.onPrimary, textAlign: 'center' },
  heroActividad: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  heroActividadTexto: { flexShrink: 1, fontFamily: DS.font.medium, fontSize: 15, color: DS.colors.onPrimaryMuted },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },

  datos: { flexDirection: 'row', gap: 10, paddingHorizontal: DS.space.screen },
  dato3: {
    flex: 1, alignItems: 'center', gap: 4, padding: 12, backgroundColor: DS.colors.surface,
    borderRadius: DS.radius.card, borderWidth: DS.border, borderColor: DS.colors.border,
  },
  dato3Valor: { fontFamily: DS.font.bold, fontSize: 14, color: DS.colors.text, textAlign: 'center' },
  dato3Label: { fontFamily: DS.font.regular, fontSize: 12, color: DS.colors.textTertiary },

  segmentado: {
    flexDirection: 'row', padding: 4, gap: 4, marginHorizontal: DS.space.screen, borderRadius: DS.radius.control,
    backgroundColor: '#EEF2F6', borderWidth: DS.border, borderColor: DS.colors.border,
  },
  segmento: { flex: 1, minHeight: 44, borderRadius: DS.radius.control - 4, paddingHorizontal: 4 },
  segmentoActivo: { backgroundColor: DS.colors.surface },
  segmentoTexto: { fontFamily: DS.font.semibold, fontSize: 13, color: DS.colors.textSecondary },
  segmentoTextoActivo: { color: DS.colors.text, fontFamily: DS.font.bold },

  seccion: { fontFamily: DS.font.bold, fontSize: 18, color: DS.colors.text, marginBottom: 10, marginHorizontal: DS.space.screen },
  card: { marginHorizontal: DS.space.screen, overflow: 'hidden' },
  cardTexto: { marginHorizontal: DS.space.screen, padding: 16 },
  cardForm: { marginHorizontal: DS.space.screen, padding: 16, gap: 4 },
  lista: { gap: 10, paddingHorizontal: DS.space.screen },
  descripcion: { fontFamily: DS.font.regular, fontSize: 15, lineHeight: 23, color: DS.colors.text },

  campoLabel: { fontFamily: DS.font.medium, fontSize: 13, color: DS.colors.textSecondary, marginBottom: 6 },
  textarea: {
    minHeight: 160, padding: 14, marginBottom: 14, backgroundColor: DS.colors.background, borderRadius: DS.radius.control,
    borderWidth: DS.border, borderColor: DS.colors.border, fontFamily: DS.font.regular, fontSize: 16, color: DS.colors.text,
  },
  filaBotones: { flexDirection: 'row', gap: 10, marginTop: 4 },

  visibilidad: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginHorizontal: DS.space.screen },
  visIcono: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  visTitulo: { fontFamily: DS.font.semibold, fontSize: 15, color: DS.colors.text },
  visTexto: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textTertiary, marginTop: 2 },

  acciones: { gap: 10, paddingHorizontal: DS.space.screen },
  eliminar: {
    flexDirection: 'row', gap: 8, height: 54, borderRadius: DS.radius.control, marginTop: 8,
    borderWidth: DS.border, borderColor: '#FECACA', backgroundColor: DS.colors.errorSoft,
  },
  eliminarTexto: { fontFamily: DS.font.semibold, fontSize: 16, color: DS.colors.error },

  subir: { flexDirection: 'row', gap: 12, paddingHorizontal: DS.space.screen },
  subirBtn: {
    flex: 1, flexDirection: 'column', gap: 6, paddingVertical: 18, minHeight: 88, borderRadius: DS.radius.card,
    backgroundColor: DS.colors.accentSoft, borderWidth: DS.border, borderColor: '#C7D2FE',
  },
  subirTexto: { fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.accent },

  adjunto: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 },
  adjuntoLink: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  adjuntoIcono: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  adjuntoTipo: { fontFamily: DS.font.semibold, fontSize: 15, color: DS.colors.text },
  adjuntoRuta: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textTertiary, marginTop: 2 },
  iconBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: DS.colors.errorSoft },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: DS.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: DS.font.bold, fontSize: 15, color: DS.colors.accent },

  pista: { fontFamily: DS.font.regular, fontSize: 13, lineHeight: 19, color: DS.colors.textSecondary, marginBottom: 12 },
  buscador: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, paddingHorizontal: 14, marginBottom: 12,
    backgroundColor: DS.colors.background, borderRadius: DS.radius.control, borderWidth: DS.border, borderColor: DS.colors.border,
  },
  buscadorInput: { flex: 1, fontFamily: DS.font.regular, fontSize: 16, color: DS.colors.text, paddingVertical: 0 },
  elegido: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', maxWidth: '100%', marginBottom: 12,
    backgroundColor: DS.colors.accentSoft, borderRadius: DS.radius.chip, paddingLeft: 14, paddingRight: 6, minHeight: 48,
    borderWidth: DS.border, borderColor: '#C7D2FE',
  },
  elegidoTexto: { flexShrink: 1, fontFamily: DS.font.semibold, fontSize: 14, color: DS.colors.accent },
  dropdown: {
    backgroundColor: DS.colors.surface, borderRadius: DS.radius.card, borderWidth: DS.border,
    borderColor: DS.colors.border, marginBottom: 12, overflow: 'hidden',
  },
  dropdownItem: { padding: 14, borderBottomWidth: DS.border, borderBottomColor: DS.colors.border },
  dropdownNombre: { fontFamily: DS.font.semibold, fontSize: 15, color: DS.colors.text },
  dropdownSub: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textTertiary, marginTop: 2 },
  dropdownPista: { fontFamily: DS.font.regular, fontSize: 13, color: DS.colors.textTertiary, padding: 14, textAlign: 'center' },

  vacio: { alignItems: 'center', gap: 12, padding: 32 },
  vacioIcono: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: DS.colors.surface,
    borderWidth: DS.border, borderColor: DS.colors.border, alignItems: 'center', justifyContent: 'center',
  },
  vacioTexto: { fontFamily: DS.font.regular, fontSize: 14, color: DS.colors.textSecondary, textAlign: 'center' },
});
