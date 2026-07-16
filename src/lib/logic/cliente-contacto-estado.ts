export type ContactoEstadoLabel = 'No contactar' | 'Autorizado' | 'Pendiente';

export type ContactoEstadoVariant = 'danger' | 'success' | 'warning';

export interface ContactoEstadoUi {
  label: ContactoEstadoLabel;
  variant: ContactoEstadoVariant;
}

export function getContactoEstadoUi(contacto: {
  autorizado: boolean;
  noContactar: boolean;
}): ContactoEstadoUi {
  if (contacto.noContactar) {
    return { label: 'No contactar', variant: 'danger' };
  }
  if (contacto.autorizado) {
    return { label: 'Autorizado', variant: 'success' };
  }
  return { label: 'Pendiente', variant: 'warning' };
}
