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
import { useCreateAcuerdo } from "@/hooks/use-acuerdos";
import { notificationToast } from "@/lib/notifications/notification-toast";
import { GraphQLRequestError } from "@/lib/graphql/client";

const tipoAcuerdoOptions = [
  { value: "PROMESA_DE_PAGO", label: "Promesa de Pago" },
  { value: "CONVENIO_PARCIAL", label: "Convenio Parcial" },
  { value: "CONVENIO_TOTAL", label: "Convenio Total" },
  { value: "REFINANCIAMIENTO", label: "Refinanciamiento" },
  { value: "REESTRUCTURADO", label: "Reestructurado" },
];

const acuerdoSchema = z.object({
  idprestamo: z.number().int().positive("El préstamo es requerido"),
  tipoAcuerdo: z.enum([
    "PROMESA_DE_PAGO",
    "CONVENIO_PARCIAL",
    "CONVENIO_TOTAL",
    "REFINANCIAMIENTO",
    "REESTRUCTURADO",
  ]),
  montoAcordado: z.number({ invalid_type_error: "El monto debe ser un número" })
    .nonnegative({ message: "El monto acordado no puede ser negativo" }),
  numeroCuotas: z.number({ invalid_type_error: "El número de cuotas debe ser un número" })
    .int({ message: "El número de cuotas debe ser un número entero" })
    .positive({ message: "El número de cuotas debe ser mayor a 0" })
    .default(1),
  fechaInicio: z.date(),
  fechaFin: z.date(),
  observacion: z.string().optional().nullable(),
  fechasPagoProgramadas: z.array(z.string()).optional().nullable(),
  idusuario: z.number().int().positive().optional().nullable(),
}).refine(
  (data) => data.fechaFin > data.fechaInicio,
  {
    message: "La fecha de fin debe ser posterior a la fecha de inicio",
    path: ["fechaFin"],
  }
);

type AcuerdoFormData = z.infer<typeof acuerdoSchema>;

interface ModalCrearAcuerdoProps {
  isOpen: boolean;
  onClose: () => void;
  idprestamo: number;
  onSuccess?: () => void;
}

export function ModalCrearAcuerdo({
  isOpen,
  onClose,
  idprestamo,
  onSuccess,
}: ModalCrearAcuerdoProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<AcuerdoFormData>({
    resolver: zodResolver(acuerdoSchema),
    defaultValues: {
      idprestamo,
      tipoAcuerdo: "PROMESA_DE_PAGO",
      montoAcordado: 0,
      numeroCuotas: 1,
      fechaInicio: new Date(),
      fechaFin: new Date(),
      observacion: null,
      fechasPagoProgramadas: null,
      idusuario: null,
    },
  });

  const mutation = useCreateAcuerdo();

  const onSubmit = async (data: AcuerdoFormData) => {
    try {
      await mutation.mutateAsync({
        input: {
          ...data,
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
        },
      });

      notificationToast.success("Acuerdo creado exitosamente");
      reset();
      onSuccess?.();
      onClose();
    } catch (error) {
      const errorMessage =
        error instanceof GraphQLRequestError
          ? error.structuredError?.userMessage || error.message
          : error instanceof Error
            ? error.message
            : "Error al crear el acuerdo";
      notificationToast.error(errorMessage);
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
      title="Crear Acuerdo de Pago"
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
                Creando...
              </>
            ) : (
              "Crear Acuerdo"
            )}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Tipo de Acuerdo *"
          options={tipoAcuerdoOptions}
          error={errors.tipoAcuerdo?.message}
          {...register("tipoAcuerdo")}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Monto Acordado *"
            type="number"
            step="0.01"
            min="0"
            {...register("montoAcordado", { valueAsNumber: true })}
            error={errors.montoAcordado?.message}
          />

          <Input
            label="Número de Cuotas *"
            type="number"
            min="1"
            {...register("numeroCuotas", { valueAsNumber: true })}
            error={errors.numeroCuotas?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <DateInput
            label="Fecha de Inicio *"
            value={watch("fechaInicio")}
            onChange={(date) => setValue("fechaInicio", date || new Date())}
            error={errors.fechaInicio?.message}
          />

          <DateInput
            label="Fecha de Fin *"
            value={watch("fechaFin")}
            onChange={(date) => setValue("fechaFin", date || new Date())}
            error={errors.fechaFin?.message}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">
            Observación
          </label>
          <textarea
            className="w-full rounded-lg border border-stroke bg-transparent px-3 py-1.5 text-sm text-dark outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
            rows={4}
            {...register("observacion")}
          />
          {errors.observacion && (
            <div className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.observacion.message}
            </div>
          )}
        </div>

        <div className="text-sm text-gray-6 dark:text-dark-6">
          <p>* Campos requeridos</p>
        </div>
      </form>
    </Modal>
  );
}

