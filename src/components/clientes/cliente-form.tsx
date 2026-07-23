'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import {
  GET_TIPOS_DOCUMENTO,
  GET_GENEROS,
  GET_ESTADOS_CIVILES,
  GET_OCUPACIONES,
  GET_TIPOS_PERSONA,
  GET_PAISES,
  GET_DEPARTAMENTOS,
} from '@/lib/graphql/queries/cliente.queries';
import type {
  Cliente,
  CreateClienteInput,
  UpdateClienteInput,
} from '@/types/cliente';
import {
  isPersonaJuridicaDescripcion,
  resolveContactoPrincipal,
  stripContactoPrincipalFromObservaciones,
  validateClienteFormByTipo,
  type ContactoPrincipalCliente,
} from '@/lib/logic/cliente-tipo-persona-logic';

interface ClienteFormProps {
  cliente?: Cliente;
  onSubmit: (data: CreateClienteInput | UpdateClienteInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const emptyForm = (): CreateClienteInput => ({
  primer_nombres: '',
  segundo_nombres: '',
  primer_apellido: '',
  segundo_apellido: '',
  razon_social: '',
  nombre_comercial: '',
  idtipodocumento: undefined,
  numerodocumento: '',
  idtipopersona: undefined,
  idpais: undefined,
  contacto_nombre: '',
  contacto_cargo: '',
  contacto_telefono: '',
  contacto_email: '',
  espep: false,
  estado: true,
});

const emptyContacto = (): ContactoPrincipalCliente => ({
  nombre: '',
  cargo: '',
  telefono: '',
  email: '',
});

export function ClienteForm({
  cliente,
  onSubmit,
  onCancel,
  isLoading = false,
}: ClienteFormProps) {
  const [formData, setFormData] = useState<CreateClienteInput>(emptyForm);
  const [contactoPrincipal, setContactoPrincipal] =
    useState<ContactoPrincipalCliente>(emptyContacto);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: tiposDocumento } = useGraphQLQuery<{
    tiposDocumento: Array<{ idtipodocumento: number; descripcion: string }>;
  }>(GET_TIPOS_DOCUMENTO, { estado: true });

  const { data: generos } = useGraphQLQuery<{
    generos: Array<{ idgenero: number; descripcion: string }>;
  }>(GET_GENEROS, { estado: true });

  const { data: estadosCiviles } = useGraphQLQuery<{
    estadosCiviles: Array<{ idestadocivil: number; descripcion: string }>;
  }>(GET_ESTADOS_CIVILES, { estado: true });

  const { data: ocupaciones } = useGraphQLQuery<{
    ocupaciones: Array<{ idocupacion: number; descripcion: string }>;
  }>(GET_OCUPACIONES, { estado: true });

  const { data: tiposPersona } = useGraphQLQuery<{
    tiposPersona: Array<{ idtipopersona: number; descripcion: string }>;
  }>(GET_TIPOS_PERSONA, { estado: true });

  const { data: paises } = useGraphQLQuery<{
    paises: Array<{ idpais: number; descripcion: string }>;
  }>(GET_PAISES, { estado: true });

  const { data: departamentos } = useGraphQLQuery<{
    departamentos: Array<{ iddepartamento: number; descripcion: string }>;
  }>(GET_DEPARTAMENTOS, {
    idpais: formData.idpais,
    estado: true,
  });

  const tipoPersonaSeleccionada = tiposPersona?.tiposPersona?.find(
    (t) => t.idtipopersona === formData.idtipopersona,
  );
  const isJuridica =
    isPersonaJuridicaDescripcion(tipoPersonaSeleccionada?.descripcion) ||
    (!tipoPersonaSeleccionada &&
      formData.idtipopersona === cliente?.tipopersona?.idtipopersona &&
      isPersonaJuridicaDescripcion(cliente?.tipopersona?.descripcion));

  useEffect(() => {
    if (cliente) {
      const contacto = resolveContactoPrincipal(cliente);
      const isClienteJuridica = isPersonaJuridicaDescripcion(
        cliente.tipopersona?.descripcion,
      );
      setFormData({
        primer_nombres: isClienteJuridica ? '' : cliente.primer_nombres,
        segundo_nombres: isClienteJuridica
          ? ''
          : cliente.segundo_nombres || '',
        primer_apellido: cliente.primer_apellido || '',
        segundo_apellido: cliente.segundo_apellido || '',
        razon_social:
          cliente.razon_social ||
          (isClienteJuridica ? cliente.primer_nombres : '') ||
          '',
        nombre_comercial:
          cliente.nombre_comercial ||
          (isClienteJuridica ? cliente.segundo_nombres || '' : ''),
        fechanacimiento: cliente.fechanacimiento || '',
        idtipodocumento: cliente.tipodocumento?.idtipodocumento,
        numerodocumento: cliente.numerodocumento,
        fechavencimientodoc: cliente.fechavencimientodoc || '',
        idgenero: cliente.genero?.idgenero,
        idestadocivil: cliente.estadocivil?.idestadocivil,
        idocupacion: cliente.ocupacion?.idocupacion,
        idtipopersona: cliente.tipopersona?.idtipopersona,
        idpais: cliente.pais?.idpais,
        iddepartamento: cliente.departamento?.iddepartamento,
        direccion: cliente.direccion || '',
        ciudad: cliente.ciudad || '',
        codigopostal: cliente.codigopostal || '',
        telefono: cliente.telefono || '',
        celular: cliente.celular || '',
        email: cliente.email || '',
        sitioweb: cliente.sitioweb || '',
        contacto_nombre: contacto.nombre,
        contacto_cargo: contacto.cargo,
        contacto_telefono: contacto.telefono,
        contacto_email: contacto.email,
        espep: cliente.espep,
        observaciones: stripContactoPrincipalFromObservaciones(
          cliente.observaciones,
        ),
        estado: cliente.estado,
      });
      setContactoPrincipal(contacto);
      setErrors({});
    } else {
      setFormData(emptyForm());
      setContactoPrincipal(emptyContacto());
      setErrors({});
    }
  }, [cliente]);

  const applyTipoPersonaChange = (idtipopersona: number | undefined) => {
    const selected = tiposPersona?.tiposPersona?.find(
      (t) => t.idtipopersona === idtipopersona,
    );
    const nextIsJuridica = isPersonaJuridicaDescripcion(selected?.descripcion);

    setFormData((prev) => {
      if (nextIsJuridica) {
        return {
          ...prev,
          idtipopersona,
          primer_nombres: '',
          segundo_nombres: '',
          primer_apellido: '',
          segundo_apellido: '',
          fechanacimiento: undefined,
          fechavencimientodoc: undefined,
          idgenero: undefined,
          idestadocivil: undefined,
          idocupacion: undefined,
          espep: false,
        };
      }
      return {
        ...prev,
        idtipopersona,
        razon_social: '',
        nombre_comercial: '',
        contacto_nombre: '',
        contacto_cargo: '',
        contacto_telefono: '',
        contacto_email: '',
      };
    });

    if (!nextIsJuridica) {
      setContactoPrincipal(emptyContacto());
    }

    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateClienteFormByTipo({
      isJuridica,
      primer_nombres: formData.primer_nombres,
      primer_apellido: formData.primer_apellido,
      razon_social: formData.razon_social,
      idtipodocumento: formData.idtipodocumento,
      numerodocumento: formData.numerodocumento,
      idtipopersona: formData.idtipopersona,
      idpais: formData.idpais,
      email: formData.email,
      sitioweb: formData.sitioweb,
      telefono: formData.telefono,
      celular: formData.celular,
      contactoNombre: contactoPrincipal.nombre,
      contactoCargo: contactoPrincipal.cargo,
      contactoTelefono: contactoPrincipal.telefono,
      contactoEmail: contactoPrincipal.email,
    });
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0];
      if (firstErrorField) {
        const element =
          document.querySelector(`[name="${firstErrorField}"]`) ||
          document.querySelector(`[id="${firstErrorField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (element as HTMLElement).focus();
        }
      }
      return;
    }

    const cleanedData: CreateClienteInput = { ...formData };

    if (isJuridica) {
      const razon = (formData.razon_social || '').trim();
      cleanedData.razon_social = razon;
      cleanedData.nombre_comercial =
        formData.nombre_comercial?.trim() || undefined;
      cleanedData.primer_nombres = razon;
      cleanedData.segundo_nombres =
        formData.nombre_comercial?.trim() || undefined;
      cleanedData.primer_apellido = undefined;
      cleanedData.segundo_apellido = undefined;
      cleanedData.fechanacimiento = undefined;
      cleanedData.fechavencimientodoc = undefined;
      cleanedData.idgenero = undefined;
      cleanedData.idestadocivil = undefined;
      cleanedData.idocupacion = undefined;
      cleanedData.espep = false;
      cleanedData.contacto_nombre = contactoPrincipal.nombre.trim();
      cleanedData.contacto_cargo = contactoPrincipal.cargo.trim();
      cleanedData.contacto_telefono = contactoPrincipal.telefono.trim();
      cleanedData.contacto_email = contactoPrincipal.email.trim();
      cleanedData.observaciones =
        stripContactoPrincipalFromObservaciones(formData.observaciones) ||
        undefined;
    } else {
      cleanedData.razon_social = undefined;
      cleanedData.nombre_comercial = undefined;
      cleanedData.contacto_nombre = undefined;
      cleanedData.contacto_cargo = undefined;
      cleanedData.contacto_telefono = undefined;
      cleanedData.contacto_email = undefined;
      cleanedData.observaciones =
        stripContactoPrincipalFromObservaciones(formData.observaciones) ||
        undefined;
    }

    if (!cleanedData.segundo_nombres) delete cleanedData.segundo_nombres;
    if (!cleanedData.segundo_apellido) delete cleanedData.segundo_apellido;
    if (!cleanedData.primer_apellido) delete cleanedData.primer_apellido;
    if (!cleanedData.fechanacimiento) delete cleanedData.fechanacimiento;
    if (!cleanedData.fechavencimientodoc) {
      delete cleanedData.fechavencimientodoc;
    }
    if (!cleanedData.idgenero) delete cleanedData.idgenero;
    if (!cleanedData.idestadocivil) delete cleanedData.idestadocivil;
    if (!cleanedData.idocupacion) delete cleanedData.idocupacion;
    if (!cleanedData.iddepartamento) delete cleanedData.iddepartamento;
    if (!cleanedData.direccion) delete cleanedData.direccion;
    if (!cleanedData.ciudad) delete cleanedData.ciudad;
    if (!cleanedData.codigopostal) delete cleanedData.codigopostal;
    if (!cleanedData.telefono) delete cleanedData.telefono;
    if (!cleanedData.celular) delete cleanedData.celular;
    if (!cleanedData.email) delete cleanedData.email;
    if (!cleanedData.sitioweb) delete cleanedData.sitioweb;
    if (!cleanedData.nombre_comercial) delete cleanedData.nombre_comercial;
    if (!cleanedData.razon_social) delete cleanedData.razon_social;
    if (!cleanedData.contacto_nombre) delete cleanedData.contacto_nombre;
    if (!cleanedData.contacto_cargo) delete cleanedData.contacto_cargo;
    if (!cleanedData.contacto_telefono) delete cleanedData.contacto_telefono;
    if (!cleanedData.contacto_email) delete cleanedData.contacto_email;
    if (!cleanedData.observaciones) {
      if (cliente) {
        cleanedData.observaciones = '';
      } else {
        delete cleanedData.observaciones;
      }
    }

    const submitData = cliente
      ? { ...cleanedData, idcliente: cliente.idcliente }
      : cleanedData;
    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-4">
        <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-3 text-base font-semibold text-dark dark:text-white">
            Tipo de Persona
          </h3>
          {(tiposPersona?.tiposPersona?.length ?? 0) === 0 && (
            <p
              className="mb-3 rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
              role="status"
            >
              No hay tipos de persona cargados. Ejecute el seed de catálogos
              cliente.
            </p>
          )}
          <Select
            label="Tipo de Persona *"
            value={formData.idtipopersona?.toString() || ''}
            onChange={(e) =>
              applyTipoPersonaChange(
                e.target.value ? Number(e.target.value) : undefined,
              )
            }
            options={
              tiposPersona?.tiposPersona?.map((t) => ({
                value: t.idtipopersona,
                label: t.descripcion,
              })) || []
            }
            placeholder="Seleccione el tipo de persona"
            error={errors.idtipopersona}
          />
        </div>

        {isJuridica ? (
          <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-3 text-base font-semibold text-dark dark:text-white">
              Datos de la Empresa
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                id="razon_social"
                label="Razón Social *"
                value={formData.razon_social || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    razon_social: e.target.value,
                  })
                }
                error={errors.razon_social}
                placeholder="Ingrese la razón social"
              />
              <Input
                label="Nombre Comercial"
                value={formData.nombre_comercial || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    nombre_comercial: e.target.value,
                  })
                }
                placeholder="Ingrese el nombre comercial (opcional)"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-3 text-base font-semibold text-dark dark:text-white">
              Información Personal
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                label="Primer Nombre *"
                value={formData.primer_nombres || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    primer_nombres: e.target.value,
                  })
                }
                error={errors.primer_nombres}
                placeholder="Ingrese el primer nombre"
              />
              <Input
                label="Segundo Nombre"
                value={formData.segundo_nombres || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    segundo_nombres: e.target.value,
                  })
                }
                placeholder="Ingrese el segundo nombre (opcional)"
              />
              <Input
                label="Primer Apellido *"
                value={formData.primer_apellido || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    primer_apellido: e.target.value,
                  })
                }
                error={errors.primer_apellido}
                placeholder="Ingrese el primer apellido"
              />
              <Input
                label="Segundo Apellido"
                value={formData.segundo_apellido || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    segundo_apellido: e.target.value,
                  })
                }
                placeholder="Ingrese el segundo apellido (opcional)"
              />
              <Input
                label="Fecha de Nacimiento"
                type="date"
                value={
                  formData.fechanacimiento
                    ? new Date(formData.fechanacimiento)
                        .toISOString()
                        .split('T')[0]
                    : ''
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fechanacimiento: e.target.value || undefined,
                  })
                }
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        )}

        <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-3 text-base font-semibold text-dark dark:text-white">
            Documentación
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label="Tipo de Documento *"
              value={formData.idtipodocumento?.toString() || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  idtipodocumento: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              options={
                tiposDocumento?.tiposDocumento?.map((t) => ({
                  value: t.idtipodocumento,
                  label: t.descripcion,
                })) || []
              }
              placeholder="Seleccione el tipo de documento"
              error={errors.idtipodocumento}
            />
            <Input
              label={isJuridica ? 'RUC / NIT *' : 'Número de Documento *'}
              value={formData.numerodocumento}
              onChange={(e) =>
                setFormData({ ...formData, numerodocumento: e.target.value })
              }
              error={errors.numerodocumento}
              placeholder={
                isJuridica
                  ? 'Ingrese el RUC o NIT'
                  : 'Ingrese el número de documento'
              }
            />
            {!isJuridica && (
              <Input
                label="Fecha de Vencimiento del Documento"
                type="date"
                value={
                  formData.fechavencimientodoc
                    ? new Date(formData.fechavencimientodoc)
                        .toISOString()
                        .split('T')[0]
                    : ''
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fechavencimientodoc: e.target.value || undefined,
                  })
                }
                min={new Date().toISOString().split('T')[0]}
              />
            )}
          </div>
        </div>

        {!isJuridica && (
          <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-3 text-base font-semibold text-dark dark:text-white">
              Información Adicional
            </h3>
            {((generos?.generos?.length ?? 0) === 0 ||
              (estadosCiviles?.estadosCiviles?.length ?? 0) === 0 ||
              (ocupaciones?.ocupaciones?.length ?? 0) === 0) && (
              <p
                className="mb-3 rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
                role="status"
              >
                Hay catálogos vacíos (género, estado civil u ocupación).
                Ejecute el seed de catálogos cliente para cargarlos.
              </p>
            )}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Select
                label="Género"
                value={formData.idgenero?.toString() || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    idgenero: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                options={
                  generos?.generos?.map((g) => ({
                    value: g.idgenero,
                    label: g.descripcion,
                  })) || []
                }
                placeholder="Seleccione el género"
              />
              <Select
                label="Estado Civil"
                value={formData.idestadocivil?.toString() || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    idestadocivil: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                options={
                  estadosCiviles?.estadosCiviles?.map((item) => ({
                    value: item.idestadocivil,
                    label: item.descripcion,
                  })) || []
                }
                placeholder="Seleccione el estado civil"
              />
              <Select
                label="Ocupación"
                value={formData.idocupacion?.toString() || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    idocupacion: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                options={
                  ocupaciones?.ocupaciones?.map((o) => ({
                    value: o.idocupacion,
                    label: o.descripcion,
                  })) || []
                }
                placeholder="Seleccione la ocupación"
              />
            </div>
          </div>
        )}

        <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-3 text-base font-semibold text-dark dark:text-white">
            Ubicación
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label="País *"
              value={formData.idpais?.toString() || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  idpais: e.target.value ? Number(e.target.value) : undefined,
                  iddepartamento: undefined,
                })
              }
              options={
                paises?.paises?.map((p) => ({
                  value: p.idpais,
                  label: p.descripcion,
                })) || []
              }
              placeholder="Seleccione el país"
              error={errors.idpais}
            />
            {formData.idpais && (
              <Select
                label="Departamento"
                value={formData.iddepartamento?.toString() || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    iddepartamento: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
                options={
                  departamentos?.departamentos?.map((d) => ({
                    value: d.iddepartamento,
                    label: d.descripcion,
                  })) || []
                }
                placeholder="Seleccione el departamento"
              />
            )}
            <Input
              label="Dirección"
              value={formData.direccion || ''}
              onChange={(e) =>
                setFormData({ ...formData, direccion: e.target.value })
              }
              placeholder="Ingrese la dirección"
            />
            <Input
              label="Ciudad"
              value={formData.ciudad || ''}
              onChange={(e) =>
                setFormData({ ...formData, ciudad: e.target.value })
              }
              placeholder="Ingrese la ciudad"
            />
            <Input
              label="Código Postal"
              value={formData.codigopostal || ''}
              onChange={(e) =>
                setFormData({ ...formData, codigopostal: e.target.value })
              }
              placeholder="Ingrese el código postal"
            />
          </div>
        </div>

        <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-3 text-base font-semibold text-dark dark:text-white">
            {isJuridica ? 'Contacto de la Empresa' : 'Contacto'}
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="Teléfono"
              type="tel"
              value={formData.telefono || ''}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d\s\-()]/g, '');
                setFormData({ ...formData, telefono: value });
              }}
              placeholder="Ingrese el teléfono"
              error={errors.telefono}
            />
            <Input
              label="Celular"
              type="tel"
              value={formData.celular || ''}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d\s\-()]/g, '');
                setFormData({ ...formData, celular: value });
              }}
              placeholder="Ingrese el celular"
              error={errors.celular}
            />
            <Input
              label="Email"
              type="email"
              value={formData.email || ''}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              error={errors.email}
              placeholder="ejemplo@correo.com"
            />
            <Input
              label="Sitio Web"
              type="url"
              value={formData.sitioweb || ''}
              onChange={(e) =>
                setFormData({ ...formData, sitioweb: e.target.value })
              }
              error={errors.sitioweb}
              placeholder="https://ejemplo.com"
            />
          </div>
        </div>

        {isJuridica && (
          <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-dark-2">
            <h3 className="mb-3 text-base font-semibold text-dark dark:text-white">
              Contacto Principal
            </h3>
            <p className="mb-3 text-sm text-gray-6 dark:text-dark-6">
              Persona de referencia de la empresa para comunicaciones y
              gestiones comerciales.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input
                id="contactoNombre"
                label="Nombre Completo *"
                value={contactoPrincipal.nombre}
                onChange={(e) =>
                  setContactoPrincipal({
                    ...contactoPrincipal,
                    nombre: e.target.value,
                  })
                }
                error={errors.contactoNombre}
                placeholder="Nombre del contacto"
              />
              <Input
                id="contactoCargo"
                label="Cargo *"
                value={contactoPrincipal.cargo}
                onChange={(e) =>
                  setContactoPrincipal({
                    ...contactoPrincipal,
                    cargo: e.target.value,
                  })
                }
                error={errors.contactoCargo}
                placeholder="Ej. Gerente general"
              />
              <Input
                id="contactoTelefono"
                label="Teléfono *"
                type="tel"
                value={contactoPrincipal.telefono}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d\s\-()]/g, '');
                  setContactoPrincipal({
                    ...contactoPrincipal,
                    telefono: value,
                  });
                }}
                error={errors.contactoTelefono}
                placeholder="Teléfono del contacto"
              />
              <Input
                id="contactoEmail"
                label="Correo Electrónico *"
                type="email"
                value={contactoPrincipal.email}
                onChange={(e) =>
                  setContactoPrincipal({
                    ...contactoPrincipal,
                    email: e.target.value,
                  })
                }
                error={errors.contactoEmail}
                placeholder="contacto@empresa.com"
              />
            </div>
          </div>
        )}

        <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-3 text-base font-semibold text-dark dark:text-white">
            Información Adicional
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {!isJuridica && (
              <div>
                <label className="mb-0 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.espep}
                    onChange={(e) =>
                      setFormData({ ...formData, espep: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
                  />
                  <span className="text-sm font-medium text-dark dark:text-white">
                    Es PEP (Persona Expuesta Políticamente)
                  </span>
                </label>
              </div>
            )}
            <div>
              <label className="mb-0 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.estado ?? true}
                  onChange={(e) =>
                    setFormData({ ...formData, estado: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
                />
                <span className="text-sm font-medium text-dark dark:text-white">
                  Estado Activo
                </span>
              </label>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">
                Observaciones
              </label>
              <textarea
                value={formData.observaciones || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    observaciones: e.target.value,
                  })
                }
                rows={3}
                className="w-full rounded-lg border border-stroke bg-transparent px-3 py-1.5 text-sm text-dark outline-none transition focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} size="sm">
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading} size="sm">
          {isLoading ? 'Guardando...' : cliente ? 'Actualizar' : 'Crear'}
        </Button>
      </div>
    </form>
  );
}
