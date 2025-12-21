"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGraphQLMutation } from "@/hooks/use-graphql-mutation";
import { useGraphQLQuery } from "@/hooks/use-graphql-query";
import {
  CREATE_PRESTAMO,
  UPDATE_PRESTAMO,
  LIST_CLIENTES_COMBO,
} from "@/lib/graphql/queries/finanzas.queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const prestamoSchema = z.object({
  idcliente: z.coerce.number().int().positive({ message: "Seleccione un cliente" }),
  codigo: z.string().min(3, { message: "Código mínimo 3 caracteres" }),
  referencia: z.string().optional(),
  tipoprestamo: z.enum(["PROPIO", "TERCERIZADO"]),
  montoSolicitado: z.coerce
    .number({ invalid_type_error: "El monto debe ser un número" })
    .nonnegative({ message: "El monto no puede ser negativo" }),
  montoAprobado: z.coerce
    .number({ invalid_type_error: "El monto debe ser un número" })
    .nonnegative({ message: "El monto no puede ser negativo" })
    .optional(),
  montoDesembolsado: z.coerce
    .number({ invalid_type_error: "El monto debe ser un número" })
    .nonnegative({ message: "El monto no puede ser negativo" })
    .optional(),
  comisionTercerizado: z.coerce
    .number({ invalid_type_error: "La comisión debe ser un número" })
    .nonnegative({ message: "La comisión no puede ser negativa" })
    .optional(),
  tasaInteresAnual: z.coerce
    .number({ invalid_type_error: "La tasa debe ser un número" })
    .nonnegative({ message: "La tasa no puede ser negativa" })
    .optional(),
  plazoMeses: z.coerce
    .number({ invalid_type_error: "El plazo debe ser un número" })
    .int({ message: "El plazo debe ser un número entero" })
    .positive({ message: "El plazo debe ser mayor a 0" })
    .optional(),
  fechaSolicitud: z.coerce.date().optional(),
  fechaAprobacion: z.coerce.date().optional(),
  fechaDesembolso: z.coerce.date().optional(),
  fechaVencimiento: z.coerce.date().optional(),
  observaciones: z.string().optional(),
});

export type PrestamoFormValues = z.infer<typeof prestamoSchema> & {
  idprestamo?: number;
};

type PrestamoFormProps = {
  initialData?: PrestamoFormValues;
  onSuccess?: () => void;
};

export function PrestamoCreateForm({ initialData, onSuccess }: PrestamoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
  } = useForm<PrestamoFormValues>({
    resolver: zodResolver(prestamoSchema),
    defaultValues: {
      tipoprestamo: "PROPIO",
      fechaSolicitud: new Date(),
    },
  });

  const { data: clientesData, isLoading: loadingClientes } = useGraphQLQuery<{
    clientes: { clientes: Array<{ idcliente: number; primer_nombres: string; primer_apellido: string; numerodocumento: string }> };
  }>(LIST_CLIENTES_COMBO, { page: 1, pageSize: 50, filters: { estado: true } });

  const createPrestamo = useGraphQLMutation<{ createPrestamo: { idprestamo: number } }, { input: PrestamoFormValues }>(
    CREATE_PRESTAMO,
    {
      onSuccess: () => {
        reset();
        onSuccess?.();
      },
    }
  );

  const updatePrestamo = useGraphQLMutation<{ updatePrestamo: { idprestamo: number } }, { input: PrestamoFormValues }>(
    UPDATE_PRESTAMO,
    {
      onSuccess: () => {
        onSuccess?.();
      },
    }
  );

  useEffect(() => {
    if (initialData) {
      reset({
        ...initialData,
      });
    }
  }, [initialData, reset]);

  const clientesOptions = useMemo(
    () =>
      clientesData?.clientes?.clientes?.map((c) => ({
        value: c.idcliente,
        label: `${c.primer_nombres} ${c.primer_apellido} (${c.numerodocumento})`,
      })) || [],
    [clientesData]
  );

  const selectedTipo = watch("tipoprestamo");

  const onSubmit = (values: PrestamoFormValues) => {
    if (initialData?.idprestamo) {
      updatePrestamo.mutate({ input: { ...values, idprestamo: initialData.idprestamo } });
    } else {
      createPrestamo.mutate({ input: values });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Select
          label="Cliente *"
          placeholder={loadingClientes ? "Cargando clientes..." : "Seleccione un cliente"}
          options={clientesOptions}
          error={errors.idcliente?.message}
          {...register("idcliente")}
        />
        <Input
          label="Código *"
          placeholder="Ej: PRE-2025-0001"
          error={errors.codigo?.message}
          {...register("codigo")}
        />
        <Input label="Referencia" placeholder="Referencia interna" {...register("referencia")} />
        <Select
          label="Tipo de préstamo *"
          options={[
            { value: "PROPIO", label: "Propio" },
            { value: "TERCERIZADO", label: "Tercerizado" },
          ]}
          error={errors.tipoprestamo?.message}
          {...register("tipoprestamo")}
        />
        <Input
          label="Monto solicitado *"
          type="number"
          step="0.01"
          min="0"
          error={errors.montoSolicitado?.message}
          {...register("montoSolicitado")}
        />
        <Input
          label="Monto aprobado"
          type="number"
          step="0.01"
          min="0"
          error={errors.montoAprobado?.message}
          {...register("montoAprobado")}
        />
        <Input
          label="Monto desembolsado"
          type="number"
          step="0.01"
          min="0"
          error={errors.montoDesembolsado?.message}
          {...register("montoDesembolsado")}
        />
        <Input
          label="Tasa interés anual (%)"
          type="number"
          step="0.0001"
          min="0"
          error={errors.tasaInteresAnual?.message}
          {...register("tasaInteresAnual")}
        />
        <Input
          label="Plazo (meses)"
          type="number"
          min="1"
          error={errors.plazoMeses?.message}
          {...register("plazoMeses")}
        />
        <Input
          label="Fecha vencimiento"
          type="date"
          error={errors.fechaVencimiento?.message}
          {...register("fechaVencimiento")}
        />
        {selectedTipo === "TERCERIZADO" && (
          <Input
            label="Comisión tercerizado"
            type="number"
            step="0.01"
            min="0"
            error={errors.comisionTercerizado?.message}
            {...register("comisionTercerizado")}
          />
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">Observaciones</label>
        <textarea
          className="w-full rounded-lg border border-stroke bg-transparent px-3 py-1.5 text-sm text-dark outline-none transition focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
          rows={3}
          {...register("observaciones")}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={isSubmitting || createPrestamo.isPending || updatePrestamo.isPending}
          size="sm"
        >
          {createPrestamo.isPending || updatePrestamo.isPending
            ? "Guardando..."
            : initialData?.idprestamo
            ? "Actualizar préstamo"
            : "Crear préstamo"}
        </Button>
      </div>

      {(createPrestamo.error || updatePrestamo.error) && (
        <p className="text-sm text-red-500">
          {createPrestamo.error?.message || updatePrestamo.error?.message || "Error al guardar el préstamo"}
        </p>
      )}
      {createPrestamo.isSuccess && !initialData?.idprestamo && (
        <p className="text-sm text-green-600">Préstamo creado correctamente.</p>
      )}
    </form>
  );
}

