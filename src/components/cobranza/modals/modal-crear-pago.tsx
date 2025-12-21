"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegistrarPagoConAplicacion } from "@/hooks/use-pagos";
import { useState } from "react";
import { notificationToast } from "@/lib/notifications/notification-toast";

const metodoPagoOptions = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "DEPOSITO", label: "Depósito" },
  { value: "TARJETA", label: "Tarjeta" },
  { value: "DEBITO_AUTOMATICO", label: "Débito Automático" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "BILLETERA", label: "Billetera" },
  { value: "DIGITAL", label: "Digital" },
  { value: "JUDICIAL", label: "Judicial" },
  { value: "EMBARGOS", label: "Embargos" },
  { value: "ORDEN_JUDICIAL", label: "Orden Judicial" },
];

const tipoCobroOptions = [
  { value: "PARCIAL", label: "Parcial" },
  { value: "TOTAL", label: "Total" },
  { value: "DESCUENTO", label: "Descuento" },
  { value: "NEGOCIADO", label: "Negociado" },
  { value: "EXTRAJUDICIAL", label: "Extrajudicial" },
];

const pagoSchema = z.object({
  idprestamo: z.number().int().positive("El préstamo es requerido"),
  idcuota: z.number().int().positive().optional().nullable(),
  idacuerdo: z.number().int().positive().optional().nullable(),
  metodoPago: z.enum([
    "EFECTIVO",
    "TRANSFERENCIA",
    "DEPOSITO",
    "TARJETA",
    "DEBITO_AUTOMATICO",
    "CHEQUE",
    "BILLETERA",
    "DIGITAL",
    "JUDICIAL",
    "EMBARGOS",
    "ORDEN_JUDICIAL",
  ]),
  tipoCobro: z.enum(["PARCIAL", "TOTAL", "DESCUENTO", "NEGOCIADO", "EXTRAJUDICIAL"]).default("PARCIAL"),
  fechaPago: z.date(),
  referencia: z.string().optional().nullable(),
  montoCapital: z.number({ invalid_type_error: "El monto debe ser un número" })
    .nonnegative({ message: "El monto de capital no puede ser negativo" })
    .default(0),
  montoInteres: z.number({ invalid_type_error: "El monto debe ser un número" })
    .nonnegative({ message: "El monto de interés no puede ser negativo" })
    .default(0),
  montoMora: z.number({ invalid_type_error: "El monto debe ser un número" })
    .nonnegative({ message: "El monto de mora no puede ser negativo" })
    .default(0),
  observacion: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  idusuario: z.number().int().positive().optional().nullable(),
}).refine(
  (data) => data.montoCapital > 0 || data.montoInteres > 0 || data.montoMora > 0,
  {
    message: "Debe ingresar al menos un monto (capital, interés o mora)",
    path: ["montoCapital"],
  }
);

type PagoFormData = z.infer<typeof pagoSchema>;

interface ModalCrearPagoProps {
  isOpen: boolean;
  onClose: () => void;
  idprestamo: number;
  idcuota?: number | null;
  idacuerdo?: number | null;
  onSuccess?: () => void;
}

export function ModalCrearPago({
  isOpen,
  onClose,
  idprestamo,
  idcuota,
  idacuerdo,
  onSuccess,
}: ModalCrearPagoProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<PagoFormData>({
    resolver: zodResolver(pagoSchema),
    defaultValues: {
      idprestamo,
      idcuota: idcuota ?? null,
      idacuerdo: idacuerdo ?? null,
      metodoPago: "EFECTIVO",
      tipoCobro: "PARCIAL",
      fechaPago: new Date(),
      montoCapital: 0,
      montoInteres: 0,
      montoMora: 0,
      referencia: null,
      observacion: null,
      notas: null,
      idusuario: null,
    },
  });

  const mutation = useRegistrarPagoConAplicacion();

  const montoCapital = watch("montoCapital");
  const montoInteres = watch("montoInteres");
  const montoMora = watch("montoMora");
  const montoTotal = (montoCapital || 0) + (montoInteres || 0) + (montoMora || 0);

  const onSubmit = async (data: PagoFormData) => {
    try {
      await mutation.mutateAsync({
        input: {
          ...data,
          montoTotal,
        },
      });

      notificationToast.success("Pago registrado exitosamente");
      reset();
      onSuccess?.();
      onClose();
    } catch (error: any) {
      notificationToast.error(
        error?.message || "Error al registrar el pago"
      );
    }
  };

  const handleClose = () => {
    if (!mutation.isPending) {
      reset();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Registrar Pago"
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Registrando...
              </>
            ) : (
              "Registrar Pago"
            )}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Método de Pago *"
            options={metodoPagoOptions}
            error={errors.metodoPago?.message}
            {...register("metodoPago")}
          />

          <Select
            label="Tipo de Cobro *"
            options={tipoCobroOptions}
            error={errors.tipoCobro?.message}
            {...register("tipoCobro")}
          />
        </div>

        <DateInput
          label="Fecha de Pago *"
          value={watch("fechaPago")}
          onChange={(date) => setValue("fechaPago", date || new Date())}
          error={errors.fechaPago?.message}
        />

        <Input
          label="Referencia"
          {...register("referencia")}
          error={errors.referencia?.message}
        />

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Capital"
            type="number"
            step="0.01"
            min="0"
            {...register("montoCapital", { valueAsNumber: true })}
            error={errors.montoCapital?.message}
          />

          <Input
            label="Interés"
            type="number"
            step="0.01"
            min="0"
            {...register("montoInteres", { valueAsNumber: true })}
            error={errors.montoInteres?.message}
          />

          <Input
            label="Mora"
            type="number"
            step="0.01"
            min="0"
            {...register("montoMora", { valueAsNumber: true })}
            error={errors.montoMora?.message}
          />
        </div>

        <div className="rounded-lg bg-gray-1 p-4 dark:bg-dark-2">
          <div className="flex justify-between text-lg font-semibold">
            <span className="text-dark dark:text-white">Total:</span>
            <span className="text-primary">
              {new Intl.NumberFormat("es-PY", {
                style: "currency",
                currency: "PYG",
              }).format(montoTotal)}
            </span>
          </div>
        </div>

        <Input
          label="Observación"
          {...register("observacion")}
          error={errors.observacion?.message}
        />

        <div className="text-sm text-gray-6 dark:text-dark-6">
          <p>* Campos requeridos</p>
        </div>
      </form>
    </Modal>
  );
}

