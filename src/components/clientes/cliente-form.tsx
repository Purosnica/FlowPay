"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useGraphQLQuery } from "@/hooks/use-graphql-query";
import {
  GET_TIPOS_DOCUMENTO,
  GET_GENEROS,
  GET_ESTADOS_CIVILES,
  GET_OCUPACIONES,
  GET_TIPOS_PERSONA,
  GET_PAISES,
  GET_DEPARTAMENTOS,
} from "@/lib/graphql/queries/cliente.queries";
import type { Cliente, CreateClienteInput, UpdateClienteInput } from "@/types/cliente";

interface ClienteFormProps {
  cliente?: Cliente;
  onSubmit: (data: CreateClienteInput | UpdateClienteInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ClienteForm({
  cliente,
  onSubmit,
  onCancel,
  isLoading = false,
}: ClienteFormProps) {
  const [formData, setFormData] = useState<CreateClienteInput>({
    primer_nombres: "",
    segundo_nombres: "",
    primer_apellido: "",
    segundo_apellido: "",
    idtipodocumento: undefined,
    numerodocumento: "",
    idtipopersona: undefined,
    idpais: undefined,
    espep: false,
    estado: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar catálogos
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

  useEffect(() => {
    if (cliente) {
      setFormData({
        primer_nombres: cliente.primer_nombres,
        segundo_nombres: cliente.segundo_nombres || "",
        primer_apellido: cliente.primer_apellido,
        segundo_apellido: cliente.segundo_apellido || "",
        fechanacimiento: cliente.fechanacimiento || "",
        idtipodocumento: cliente.tipodocumento?.idtipodocumento,
        numerodocumento: cliente.numerodocumento,
        fechavencimientodoc: cliente.fechavencimientodoc || "",
        idgenero: cliente.genero?.idgenero,
        idestadocivil: cliente.estadocivil?.idestadocivil,
        idocupacion: cliente.ocupacion?.idocupacion,
        idtipopersona: cliente.tipopersona?.idtipopersona,
        idpais: cliente.pais?.idpais,
        iddepartamento: cliente.departamento?.iddepartamento,
        direccion: cliente.direccion || "",
        ciudad: cliente.ciudad || "",
        codigopostal: cliente.codigopostal || "",
        telefono: cliente.telefono || "",
        celular: cliente.celular || "",
        email: cliente.email || "",
        sitioweb: cliente.sitioweb || "",
        espep: cliente.espep,
        observaciones: cliente.observaciones || "",
        estado: cliente.estado,
      });
      setErrors({});
    } else {
      // Reset form cuando no hay cliente
      setFormData({
        primer_nombres: "",
        segundo_nombres: "",
        primer_apellido: "",
        segundo_apellido: "",
        idtipodocumento: undefined,
        numerodocumento: "",
        idtipopersona: undefined,
        idpais: undefined,
        espep: false,
        estado: true,
      });
      setErrors({});
    }
  }, [cliente]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.primer_nombres?.trim()) {
      newErrors.primer_nombres = "El primer nombre es requerido";
    } else if (formData.primer_nombres.trim().length < 2) {
      newErrors.primer_nombres = "El primer nombre debe tener al menos 2 caracteres";
    }

    if (!formData.primer_apellido?.trim()) {
      newErrors.primer_apellido = "El primer apellido es requerido";
    } else if (formData.primer_apellido.trim().length < 2) {
      newErrors.primer_apellido = "El primer apellido debe tener al menos 2 caracteres";
    }

    if (!formData.idtipodocumento || formData.idtipodocumento === 0) {
      newErrors.idtipodocumento = "El tipo de documento es requerido";
    }

    if (!formData.numerodocumento?.trim()) {
      newErrors.numerodocumento = "El número de documento es requerido";
    } else if (formData.numerodocumento.trim().length < 3) {
      newErrors.numerodocumento = "El número de documento debe tener al menos 3 caracteres";
    }

    if (!formData.idtipopersona || formData.idtipopersona === 0) {
      newErrors.idtipopersona = "El tipo de persona es requerido";
    }

    if (!formData.idpais || formData.idpais === 0) {
      newErrors.idpais = "El país es requerido";
    }

    if (formData.email && formData.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "El email no es válido";
      }
    }

    if (formData.sitioweb && formData.sitioweb.trim()) {
      try {
        new URL(formData.sitioweb);
      } catch {
        newErrors.sitioweb = "La URL del sitio web no es válida";
      }
    }

    // Validar teléfono (solo números, espacios, guiones y paréntesis)
    if (formData.telefono && formData.telefono.trim()) {
      const phoneRegex = /^[\d\s\-()]+$/;
      if (!phoneRegex.test(formData.telefono)) {
        newErrors.telefono = "El teléfono solo debe contener números, espacios, guiones y paréntesis";
      } else if (formData.telefono.replace(/\D/g, '').length < 7) {
        newErrors.telefono = "El teléfono debe tener al menos 7 dígitos";
      }
    }

    // Validar celular (solo números, espacios, guiones y paréntesis)
    if (formData.celular && formData.celular.trim()) {
      const phoneRegex = /^[\d\s\-()]+$/;
      if (!phoneRegex.test(formData.celular)) {
        newErrors.celular = "El celular solo debe contener números, espacios, guiones y paréntesis";
      } else if (formData.celular.replace(/\D/g, '').length < 7) {
        newErrors.celular = "El celular debe tener al menos 7 dígitos";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // Limpiar valores undefined antes de enviar
      const cleanedData = { ...formData };
      if (!cleanedData.segundo_nombres) delete cleanedData.segundo_nombres;
      if (!cleanedData.segundo_apellido) delete cleanedData.segundo_apellido;
      if (!cleanedData.fechanacimiento) delete cleanedData.fechanacimiento;
      if (!cleanedData.fechavencimientodoc) delete cleanedData.fechavencimientodoc;
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
      if (!cleanedData.observaciones) delete cleanedData.observaciones;

      const submitData = cliente
        ? { ...cleanedData, idcliente: cliente.idcliente }
        : cleanedData;
      onSubmit(submitData);
    } else {
      // Scroll al primer error
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        const element = document.querySelector(`[name="${firstErrorField}"]`) ||
          document.querySelector(`[id="${firstErrorField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          (element as HTMLElement).focus();
        }
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-4">
        <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-3 text-base font-semibold text-dark dark:text-white">
            Información Personal
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="Primer Nombre *"
              value={formData.primer_nombres}
              onChange={(e) =>
                setFormData({ ...formData, primer_nombres: e.target.value })
              }
              error={errors.primer_nombres}
              placeholder="Ingrese el primer nombre"
            />
            <Input
              label="Segundo Nombre"
              value={formData.segundo_nombres}
              onChange={(e) =>
                setFormData({ ...formData, segundo_nombres: e.target.value })
              }
              placeholder="Ingrese el segundo nombre (opcional)"
            />
            <Input
              label="Primer Apellido *"
              value={formData.primer_apellido}
              onChange={(e) =>
                setFormData({ ...formData, primer_apellido: e.target.value })
              }
              error={errors.primer_apellido}
              placeholder="Ingrese el primer apellido"
            />
            <Input
              label="Segundo Apellido"
              value={formData.segundo_apellido}
              onChange={(e) =>
                setFormData({ ...formData, segundo_apellido: e.target.value })
              }
              placeholder="Ingrese el segundo apellido (opcional)"
            />
            <Input
              label="Fecha de Nacimiento"
              type="date"
              value={
                formData.fechanacimiento
                  ? new Date(formData.fechanacimiento).toISOString().split("T")[0]
                  : ""
              }
              onChange={(e) =>
                setFormData({
                  ...formData,
                  fechanacimiento: e.target.value || undefined,
                })
              }
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-3 text-base font-semibold text-dark dark:text-white">
            Documentación
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label="Tipo de Documento *"
              value={formData.idtipodocumento?.toString() || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  idtipodocumento: e.target.value ? Number(e.target.value) : undefined,
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
              label="Número de Documento *"
              value={formData.numerodocumento}
              onChange={(e) =>
                setFormData({ ...formData, numerodocumento: e.target.value })
              }
              error={errors.numerodocumento}
              placeholder="Ingrese el número de documento"
            />
            <Input
              label="Fecha de Vencimiento del Documento"
              type="date"
              value={
                formData.fechavencimientodoc
                  ? new Date(formData.fechavencimientodoc)
                      .toISOString()
                      .split("T")[0]
                  : ""
              }
              onChange={(e) =>
                setFormData({
                  ...formData,
                  fechavencimientodoc: e.target.value || undefined,
                })
              }
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>

        <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-3 text-base font-semibold text-dark dark:text-white">
            Información Adicional
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label="Género"
              value={formData.idgenero?.toString() || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  idgenero: e.target.value ? Number(e.target.value) : undefined,
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
              value={formData.idestadocivil?.toString() || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  idestadocivil: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              options={
                estadosCiviles?.estadosCiviles?.map((e) => ({
                  value: e.idestadocivil,
                  label: e.descripcion,
                })) || []
              }
              placeholder="Seleccione el estado civil"
            />
            <Select
              label="Ocupación"
              value={formData.idocupacion?.toString() || ""}
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
            <Select
              label="Tipo de Persona *"
              value={formData.idtipopersona?.toString() || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  idtipopersona: e.target.value ? Number(e.target.value) : undefined,
                })
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
        </div>

        <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-3 text-base font-semibold text-dark dark:text-white">
            Ubicación
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Select
              label="País *"
              value={formData.idpais?.toString() || ""}
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
                value={formData.iddepartamento?.toString() || ""}
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
              value={formData.direccion}
              onChange={(e) =>
                setFormData({ ...formData, direccion: e.target.value })
              }
              placeholder="Ingrese la dirección"
            />
            <Input
              label="Ciudad"
              value={formData.ciudad}
              onChange={(e) =>
                setFormData({ ...formData, ciudad: e.target.value })
              }
              placeholder="Ingrese la ciudad"
            />
            <Input
              label="Código Postal"
              value={formData.codigopostal}
              onChange={(e) =>
                setFormData({ ...formData, codigopostal: e.target.value })
              }
              placeholder="Ingrese el código postal"
            />
          </div>
        </div>

        <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-3 text-base font-semibold text-dark dark:text-white">
            Contacto
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Input
              label="Teléfono"
              type="tel"
              value={formData.telefono}
              onChange={(e) => {
                // Solo permitir números, espacios, guiones y paréntesis
                const value = e.target.value.replace(/[^\d\s\-()]/g, '');
                setFormData({ ...formData, telefono: value });
              }}
              placeholder="Ingrese el teléfono"
              error={errors.telefono}
            />
            <Input
              label="Celular"
              type="tel"
              value={formData.celular}
              onChange={(e) => {
                // Solo permitir números, espacios, guiones y paréntesis
                const value = e.target.value.replace(/[^\d\s\-()]/g, '');
                setFormData({ ...formData, celular: value });
              }}
              placeholder="Ingrese el celular"
              error={errors.celular}
            />
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              error={errors.email}
              placeholder="ejemplo@correo.com"
            />
            <Input
              label="Sitio Web"
              type="url"
              value={formData.sitioweb}
              onChange={(e) =>
                setFormData({ ...formData, sitioweb: e.target.value })
              }
              error={errors.sitioweb}
              placeholder="https://ejemplo.com"
            />
          </div>
        </div>

        <div className="rounded-lg border border-stroke bg-white p-4 shadow-sm dark:border-dark-3 dark:bg-dark-2">
          <h3 className="mb-3 text-base font-semibold text-dark dark:text-white">
            Información Adicional
          </h3>
          <div className="grid grid-cols-1 gap-2">
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
            <div>
              <label className="mb-0 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.estado}
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
                value={formData.observaciones || ""}
                onChange={(e) =>
                  setFormData({ ...formData, observaciones: e.target.value })
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
          {isLoading ? "Guardando..." : cliente ? "Actualizar" : "Crear"}
        </Button>
      </div>
    </form>
  );
}




