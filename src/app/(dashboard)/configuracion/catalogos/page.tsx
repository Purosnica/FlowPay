'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useGraphQLQuery } from '@/hooks/use-graphql-query';
import { useGraphQLMutation } from '@/hooks/use-graphql-mutation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { PERMISO } from '@/lib/permissions/permiso-codes';
import {
  GET_CODIGOS_COBRANZA,
  CREATE_CODIGO_ACCION,
  UPDATE_CODIGO_ACCION,
  CREATE_CODIGO_RESULTADO,
  UPDATE_CODIGO_RESULTADO,
} from '@/lib/graphql/queries/catalogos.queries';

type Accion = {
  idcodaccion: number;
  codigo: string;
  descripcion: string;
  esTercero: boolean;
  estado: boolean;
};

type Resultado = {
  idcodresultado: number;
  codigo: string;
  descripcion: string;
  grupo: string;
  tipoGestion: string;
  estado: boolean;
};

type Form = {
  codigo: string;
  descripcion: string;
  esTercero?: boolean;
  grupo?: string;
  tipoGestion?: string;
  estado: boolean;
};

const emptyForm: Form = {
  codigo: '',
  descripcion: '',
  esTercero: false,
  grupo: 'LOCALIZADO',
  tipoGestion: 'GESTION EFECTIVA',
  estado: true,
};

export default function CatalogosCobranzaPage() {
  const { permisos } = useAuth();
  const puedeEscribir = permisos.includes(PERMISO.CONFIG_SYSTEM);
  const queryClient = useQueryClient();
  const [tipo, setTipo] = useState<'acciones' | 'resultados'>('resultados');
  const [editing, setEditing] = useState<Accion | Resultado | undefined>();
  const [form, setForm] = useState<Form>(emptyForm);
  const [open, setOpen] = useState(false);

  const { data, isLoading, error } = useGraphQLQuery<{
    codigosAccion: Accion[];
    codigosResultado: Resultado[];
  }>(GET_CODIGOS_COBRANZA);

  const refresh = () => queryClient.invalidateQueries({ queryKey: [GET_CODIGOS_COBRANZA] });
  const close = () => { setOpen(false); setEditing(undefined); setForm(emptyForm); };

  const createAccion = useGraphQLMutation(CREATE_CODIGO_ACCION, {
    successMessage: 'Código de acción creado',
    onSuccess: () => { refresh(); close(); },
  });
  const updateAccion = useGraphQLMutation(UPDATE_CODIGO_ACCION, {
    successMessage: 'Código de acción actualizado',
    onSuccess: () => { refresh(); close(); },
  });
  const createResultado = useGraphQLMutation(CREATE_CODIGO_RESULTADO, {
    successMessage: 'Código de resultado creado',
    onSuccess: () => { refresh(); close(); },
  });
  const updateResultado = useGraphQLMutation(UPDATE_CODIGO_RESULTADO, {
    successMessage: 'Código de resultado actualizado',
    onSuccess: () => { refresh(); close(); },
  });

  const saving =
    createAccion.isPending ||
    updateAccion.isPending ||
    createResultado.isPending ||
    updateResultado.isPending;

  // ── Validador de código duplicado ────────────────────────────────────────
  const codigosDuplicados = useMemo(() => {
    const lista = tipo === 'acciones'
      ? (data?.codigosAccion ?? [])
      : (data?.codigosResultado ?? []);

    return new Set(lista.map((r) => r.codigo.toUpperCase()));
  }, [data, tipo]);

  const codigoActual = editing?.codigo.toUpperCase();
  const codigoTeclado = form.codigo.toUpperCase().trim();

  /**
   * True cuando el código teclado ya existe en la lista Y no es el mismo
   * registro que estamos editando (evitar falso positivo al editar).
   */
  const codigoDuplicado =
    codigoTeclado.length > 0 &&
    codigosDuplicados.has(codigoTeclado) &&
    codigoActual !== codigoTeclado;
  // ─────────────────────────────────────────────────────────────────────────

  const openNew = () => { setEditing(undefined); setForm(emptyForm); setOpen(true); };
  const openEdit = (row: Accion | Resultado) => {
    setEditing(row);
    setForm(
      'idcodresultado' in row
        ? { codigo: row.codigo, descripcion: row.descripcion, grupo: row.grupo, tipoGestion: row.tipoGestion, estado: row.estado }
        : { codigo: row.codigo, descripcion: row.descripcion, esTercero: row.esTercero, estado: row.estado },
    );
    setOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (codigoDuplicado) return; // seguridad extra (el botón ya estará deshabilitado)

    if (tipo === 'acciones') {
      const input = {
        codigo: form.codigo,
        descripcion: form.descripcion,
        esTercero: form.esTercero ?? false,
        estado: form.estado,
      };
      if (editing) updateAccion.mutate({ input: { idcodaccion: (editing as Accion).idcodaccion, ...input } });
      else createAccion.mutate({ input });
    } else {
      const input = {
        codigo: form.codigo,
        descripcion: form.descripcion,
        grupo: form.grupo ?? '',
        tipoGestion: form.tipoGestion ?? '',
        estado: form.estado,
      };
      if (editing) updateResultado.mutate({ input: { idcodresultado: (editing as Resultado).idcodresultado, ...input } });
      else createResultado.mutate({ input });
    }
  };

  const rows = tipo === 'acciones' ? data?.codigosAccion ?? [] : data?.codigosResultado ?? [];

  return (
    <div className="p-4 md:p-6">
      {/* Encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Catálogos de cobranza</h1>
          <p className="mt-1 text-sm text-gray-6 dark:text-dark-6">
            Administre los códigos usados para registrar gestiones.
          </p>
        </div>
        {puedeEscribir && <Button onClick={openNew}>Nuevo código</Button>}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <Button
          variant={tipo === 'resultados' ? 'primary' : 'outline'}
          onClick={() => setTipo('resultados')}
        >
          Códigos de resultado
        </Button>
        <Button
          variant={tipo === 'acciones' ? 'primary' : 'outline'}
          onClick={() => setTipo('acciones')}
        >
          Códigos de acción
        </Button>
      </div>

      {/* Error de carga */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          No se pudieron cargar los catálogos.
        </div>
      )}

      {/* Tabla */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-6">Cargando...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-1 dark:bg-dark-2">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Descripción</th>
                {tipo === 'resultados' ? (
                  <>
                    <th className="px-4 py-3">Grupo</th>
                    <th className="px-4 py-3">Tipo de gestión</th>
                  </>
                ) : (
                  <th className="px-4 py-3">Tercero</th>
                )}
                <th className="px-4 py-3">Estado</th>
                {puedeEscribir && <th className="px-4 py-3">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isResultado = 'idcodresultado' in row;
                const id = isResultado ? row.idcodresultado : (row as Accion).idcodaccion;
                return (
                  <tr key={id} className="border-t border-stroke dark:border-dark-3">
                    <td className="px-4 py-3 font-mono font-semibold">{row.codigo}</td>
                    <td className="px-4 py-3">{row.descripcion}</td>
                    {isResultado ? (
                      <>
                        <td className="px-4 py-3">{(row as Resultado).grupo}</td>
                        <td className="px-4 py-3">{(row as Resultado).tipoGestion}</td>
                      </>
                    ) : (
                      <td className="px-4 py-3">{(row as Accion).esTercero ? 'Sí' : 'No'}</td>
                    )}
                    <td className="px-4 py-3">{row.estado ? 'Activo' : 'Inactivo'}</td>
                    {puedeEscribir && (
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                          Editar
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="p-8 text-center text-gray-6">No hay códigos registrados.</p>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={open}
        onClose={close}
        title={`${editing ? 'Editar' : 'Nuevo'} código de ${tipo === 'acciones' ? 'acción' : 'resultado'}`}
      >
        <form onSubmit={submit} className="space-y-4">

          {/* Campo: Código */}
          <div>
            <label className="block text-sm font-medium">
              Código
              <input
                required
                maxLength={32}
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                className={`mt-1 w-full rounded-lg border px-3 py-2 font-mono uppercase dark:bg-dark-2
                  ${codigoDuplicado
                    ? 'border-red-400 bg-red-50 text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400 dark:border-red-500 dark:bg-red-900/20 dark:text-red-400'
                    : 'border-stroke dark:border-dark-3'
                  }`}
              />
            </label>
            {/* Mensaje de error de duplicado */}
            {codigoDuplicado && (
              <p className="mt-1 flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                El código <strong className="font-mono">{codigoTeclado}</strong> ya existe. Use uno diferente.
              </p>
            )}
          </div>

          {/* Campo: Descripción */}
          <label className="block text-sm font-medium">
            Descripción
            <input
              required
              maxLength={255}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="mt-1 w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark-2"
            />
          </label>

          {/* Campos específicos por tipo */}
          {tipo === 'resultados' ? (
            <>
              <label className="block text-sm font-medium">
                Grupo
                <input
                  required
                  value={form.grupo}
                  onChange={(e) => setForm({ ...form, grupo: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark-2"
                />
              </label>
              <label className="block text-sm font-medium">
                Tipo de gestión
                <input
                  required
                  value={form.tipoGestion}
                  onChange={(e) => setForm({ ...form, tipoGestion: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-dark-2"
                />
              </label>
            </>
          ) : (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.esTercero}
                onChange={(e) => setForm({ ...form, esTercero: e.target.checked })}
              />
              Es contacto con tercero
            </label>
          )}

          {/* Activo */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.checked })}
            />
            Activo
          </label>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || codigoDuplicado}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
