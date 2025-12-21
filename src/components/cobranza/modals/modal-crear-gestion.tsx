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
import { useCreateGestion, useResultadosGestion } from "@/hooks/use-gestiones";
import { notificationToast } from "@/lib/notifications/notification-toast";

const tipoGestionOptions = [
  { value: "LLAMADA", label: "Llamada" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "SMS", label: "SMS" },
  { value: "VISITA", label: "Visita" },
  { value: "CORREO", label: "Correo" },
  { value: "OTRO", label: "Otro" },
];

const canalOptions = [
  { value: "OFICINA", label: "Oficina" },
  { value: "CAMPO", label: "Campo" },
  { value: "CALL_CENTER", label: "Call Center" },
  { value: "DIGITAL", label: "Digital" },
  { value: "AGENTE_EXTERNO", label: "Agente Externo" },
  { value: "ALIADO", label: "Aliado" },
];

const gestionSchema = z.object({
  idprestamo: z.number().int().positive("El préstamo es requerido"),
  idcuota: z.number().int().positive().optional().nullable(),
  tipoGestion: z.enum(["LLAMADA", "WHATSAPP", "SMS", "VISITA", "CORREO", "OTRO"]),
  canal: z.enum(["OFICINA", "CAMPO", "CALL_CENTER", "DIGITAL", "AGENTE_EXTERNO", "ALIADO"]),
  fechaGestion: z.date(),
  proximaAccion: z.date().optional().nullable(),
  duracionLlamada: z.number().int().nonnegative().optional().nullable(),
  resumen: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  idresultado: z.number().int().positive().optional().nullable(),
  idusuario: z.number().int().positive().optional().nullable(),
});

type GestionFormData = z.infer<typeof gestionSchema>;

interface ModalCrearGestionProps {
  isOpen: boolean;
  onClose: () => void;
  idprestamo: number;
  idcuota?: number | null;
  onSuccess?: () => void;
}

export function ModalCrearGestion({
  isOpen,
  onClose,
  idprestamo,
  idcuota,
  onSuccess,
}: ModalCrearGestionProps) {
  const { data: resultadosData } = useResultadosGestion(true);
  const resultadosOptions =
    (resultadosData as { resultadosGestion?: any[] })?.resultadosGestion?.map((r: any) => ({
      value: r.idresultado,
      label: r.descripcion,
    })) || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<GestionFormData>({
    resolver: zodResolver(gestionSchema),
    defaultValues: {
      idprestamo,
      idcuota: idcuota ?? null,
      tipoGestion: "LLAMADA",
      canal: "OFICINA",
      fechaGestion: new Date(),
      proximaAccion: null,
      duracionLlamada: null,
      resumen: null,
      notas: null,
      idresultado: null,
      idusuario: null,
    },
  });

  const mutation = useCreateGestion();

  const onSubmit = async (data: GestionFormData) => {
    try {
      await mutation.mutateAsync({
        input: data,
      });

      notificationToast.success("Gestión registrada exitosamente");
      reset();
      onSuccess?.();
      onClose();
    } catch (error: any) {
      notificationToast.error(
        error?.message || "Error al registrar la gestión"
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
      title="Registrar Gestión de Cobranza"
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
              "Registrar Gestión"
            )}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Tipo de Gestión *"
            options={tipoGestionOptions}
            error={errors.tipoGestion?.message}
            {...register("tipoGestion")}
          />

          <Select
            label="Canal *"
            options={canalOptions}
            error={errors.canal?.message}
            {...register("canal")}
          />
        </div>

        <DateInput
          label="Fecha de Gestión *"
          value={watch("fechaGestion")}
          onChange={(date) => setValue("fechaGestion", date || new Date())}
          error={errors.fechaGestion?.message}
          enableTime
        />

        <DateInput
          label="Próxima Acción"
          value={watch("proximaAccion")}
          onChange={(date) => setValue("proximaAccion", date)}
          error={errors.proximaAccion?.message}
        />

        {watch("tipoGestion") === "LLAMADA" && (
          <Input
            label="Duración (minutos)"
            type="number"
            min="0"
            {...register("duracionLlamada", { valueAsNumber: true })}
            error={errors.duracionLlamada?.message}
          />
        )}

        {resultadosOptions.length > 0 && (
          <Select
            label="Resultado"
            options={resultadosOptions}
            placeholder="Seleccione un resultado"
            {...register("idresultado", { valueAsNumber: true })}
            error={errors.idresultado?.message}
          />
        )}

        <Input
          label="Resumen"
          {...register("resumen")}
          error={errors.resumen?.message}
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">
            Notas
          </label>
          <textarea
            className="w-full rounded-lg border border-stroke bg-transparent px-3 py-1.5 text-sm text-dark outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
            rows={4}
            {...register("notas")}
          />
          {errors.notas && (
            <div className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.notas.message}
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

