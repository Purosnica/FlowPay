"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useGraphQLMutation } from "@/hooks/use-graphql-mutation";
import { useGraphQLQuery } from "@/hooks/use-graphql-query";
import {
  CREATE_PAGO,
  UPDATE_PAGO,
  LIST_CUOTAS_POR_PRESTAMO,
  LIST_PRESTAMOS_COMBO,
} from "@/lib/graphql/queries/finanzas.queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const pagoSchema = z.object({
  idprestamo: z.coerce.number().int().positive({ message: "Seleccione un préstamo" }),
  idcuota: z.coerce.number().int().positive().optional(),
  idusuario: z.coerce.number().int().positive().optional(),
  metodoPago: z.enum([
    "EFECTIVO",
    "TRANSFERENCIA",
    "DEPOSITO",
    "TARJETA",
    "DEBITO_AUTOMATICO",
    "CHEQUE",
    "BILLETERA",
    "DIGITAL",
  ]).optional(),
  fechaPago: z.coerce.date().optional(),
  referencia: z.string().optional(),
  montoCapital: z.coerce
    .number({ invalid_type_error: "El monto debe ser un número" })
    .nonnegative({ message: "El monto no puede ser negativo" })
    .default(0),
  montoInteres: z.coerce
    .number({ invalid_type_error: "El monto debe ser un número" })
    .nonnegative({ message: "El monto no puede ser negativo" })
    .default(0),
  montoMora: z.coerce
    .number({ invalid_type_error: "El monto debe ser un número" })
    .nonnegative({ message: "El monto no puede ser negativo" })
    .default(0),
  montoTotal: z.coerce
    .number({ invalid_type_error: "El monto debe ser un número" })
    .nonnegative({ message: "El monto no puede ser negativo" })
    .optional(),
  notas: z.string().optional(),
});

export type PagoFormValues = z.infer<typeof pagoSchema> & { idpago?: number };

type PagoFormProps = {
  initialData?: PagoFormValues;
  onSuccess?: () => void;
};

export function PagoCreateForm({ initialData, onSuccess }: PagoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
    setError,
  } = useForm<PagoFormValues>({
    resolver: zodResolver(pagoSchema),
    defaultValues: {
      metodoPago: "EFECTIVO",
      fechaPago: new Date(),
    },
  });

  const selectedPrestamo = watch("idprestamo");

  const { data: prestamosData, isLoading: loadingPrestamos } = useGraphQLQuery<{
    prestamos: { prestamos: Array<{ idprestamo: number; codigo: string; idcliente: number }> };
  }>(LIST_PRESTAMOS_COMBO, { filters: { page: 1, pageSize: 50 } });

  const { data: cuotasData, isLoading: loadingCuotas } = useGraphQLQuery<{
    cuotasPorPrestamo: { cuotas: Array<{ idcuota: number; numero: number; estado: string }> };
  }>(LIST_CUOTAS_POR_PRESTAMO, { idprestamo: selectedPrestamo }, { enabled: !!selectedPrestamo });

  const createPago = useGraphQLMutation<{ createPago: { idpago: number } }, { input: PagoFormValues }>(
    CREATE_PAGO,
    {
      onSuccess: () => {
        reset({ metodoPago: "EFECTIVO", fechaPago: new Date() } as any);
        onSuccess?.();
      },
    }
  );

  const updatePago = useGraphQLMutation<{ updatePago: { idpago: number } }, { input: PagoFormValues }>(
    UPDATE_PAGO,
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

  const prestamoOptions = useMemo(
    () =>
      prestamosData?.prestamos?.prestamos?.map((p) => ({
        value: p.idprestamo,
        label: `Préstamo ${p.codigo} (Cliente ${p.idcliente})`,
      })) || [],
    [prestamosData]
  );

  const cuotaOptions = useMemo(
    () =>
      cuotasData?.cuotasPorPrestamo?.cuotas?.map((c) => ({
        value: c.idcuota,
        label: `Cuota #${c.numero} - ${c.estado}`,
      })) || [],
    [cuotasData]
  );

  const metodoPagoOptions = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "DEPOSITO", label: "Depósito" },
    { value: "TARJETA", label: "Tarjeta" },
    { value: "DEBITO_AUTOMATICO", label: "Débito automático" },
    { value: "CHEQUE", label: "Cheque" },
    { value: "BILLETERA", label: "Billetera" },
    { value: "DIGITAL", label: "Digital" },
  ];

  const onSubmit = (values: PagoFormValues) => {
    // Validar que metodoPago esté presente
    if (!values.metodoPago) {
      setError("metodoPago", { message: "Seleccione un método de pago" });
      return;
    }
    const montoTotal =
      values.montoTotal ??
      (values.montoCapital || 0) + (values.montoInteres || 0) + (values.montoMora || 0);
    if (initialData?.idpago) {
      updatePago.mutate({ input: { ...values, montoTotal, idpago: initialData.idpago } });
    } else {
      createPago.mutate({ input: { ...values, montoTotal } });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Select
          label="Préstamo *"
          placeholder={loadingPrestamos ? "Cargando préstamos..." : "Seleccione un préstamo"}
          options={prestamoOptions}
          error={errors.idprestamo?.message}
          {...register("idprestamo")}
        />
        <Select
          label="Cuota"
          placeholder={
            selectedPrestamo
              ? loadingCuotas
                ? "Cargando cuotas..."
                : "Seleccione una cuota (opcional)"
              : "Seleccione primero un préstamo"
          }
          options={cuotaOptions}
          disabled={!selectedPrestamo}
          error={errors.idcuota?.message}
          {...register("idcuota")}
        />
        <Select
          label="Método de pago *"
          options={metodoPagoOptions}
          error={errors.metodoPago?.message}
          {...register("metodoPago")}
        />
        <Input
          label="Fecha de pago"
          type="date"
          error={errors.fechaPago?.message}
          {...register("fechaPago")}
        />
        <Input
          label="Referencia"
          placeholder="N° transacción, voucher, etc."
          {...register("referencia")}
        />
        <Input
          label="Monto capital"
          type="number"
          step="0.01"
          min="0"
          error={errors.montoCapital?.message}
          {...register("montoCapital")}
        />
        <Input
          label="Monto interés"
          type="number"
          step="0.01"
          min="0"
          error={errors.montoInteres?.message}
          {...register("montoInteres")}
        />
        <Input
          label="Monto mora"
          type="number"
          step="0.01"
          min="0"
          error={errors.montoMora?.message}
          {...register("montoMora")}
        />
        <Input
          label="Monto total (auto si vacío)"
          type="number"
          step="0.01"
          min="0"
          error={errors.montoTotal?.message}
          {...register("montoTotal")}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">Notas</label>
        <textarea
          className="w-full rounded-lg border border-stroke bg-transparent px-3 py-1.5 text-sm text-dark outline-none transition focus:border-primary focus-visible:shadow-none dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
          rows={3}
          {...register("notas")}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={isSubmitting || createPago.isPending || updatePago.isPending}
          size="sm"
        >
          {createPago.isPending || updatePago.isPending
            ? "Guardando..."
            : initialData?.idpago
            ? "Actualizar pago"
            : "Registrar pago"}
        </Button>
      </div>

      {(createPago.error || updatePago.error) && (
        <p className="text-sm text-red-500">
          {createPago.error?.message || updatePago.error?.message || "Error al guardar el pago"}
        </p>
      )}
      {createPago.isSuccess && !initialData?.idpago && (
        <p className="text-sm text-green-600">Pago registrado correctamente.</p>
      )}
    </form>
  );
}

