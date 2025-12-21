"use client";

import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAsignarCartera } from "@/hooks/use-asignacion";
import { useCobradores } from "@/hooks/use-cobradores";
import { notificationToast } from "@/lib/notifications/notification-toast";

const asignacionSchema = z.object({
  idprestamo: z.number().int().positive("El préstamo es requerido"),
  idusuario: z.number().int().positive("El cobrador es requerido"),
  motivo: z.string().optional().nullable(),
  idusuarioAsignador: z.number().int().positive().optional().nullable(),
});

type AsignacionFormData = z.infer<typeof asignacionSchema>;

interface ModalAsignarCobradorProps {
  isOpen: boolean;
  onClose: () => void;
  idprestamo: number;
  onSuccess?: () => void;
}

export function ModalAsignarCobrador({
  isOpen,
  onClose,
  idprestamo,
  onSuccess,
}: ModalAsignarCobradorProps) {
  const { data: cobradoresData, isLoading: loadingCobradores } = useCobradores();
  const cobradoresOptions =
    (cobradoresData as { usuarios?: any[] })?.usuarios?.map((c: any) => ({
      value: c.idusuario,
      label: `${c.nombre} (${c.email})`,
    })) || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AsignacionFormData>({
    resolver: zodResolver(asignacionSchema),
    defaultValues: {
      idprestamo,
      idusuario: undefined,
      motivo: null,
      idusuarioAsignador: null,
    },
  });

  const mutation = useAsignarCartera();

  const onSubmit = async (data: AsignacionFormData) => {
    try {
      await mutation.mutateAsync({
        input: data,
      });

      notificationToast.success("Cobrador asignado exitosamente");
      reset();
      onSuccess?.();
      onClose();
    } catch (error: any) {
      notificationToast.error(
        error?.message || "Error al asignar el cobrador"
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
      title="Asignar Cobrador"
      size="md"
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
            disabled={mutation.isPending || loadingCobradores}
          >
            {mutation.isPending ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Asignando...
              </>
            ) : (
              "Asignar Cobrador"
            )}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Cobrador *"
          options={cobradoresOptions}
          placeholder="Seleccione un cobrador"
          error={errors.idusuario?.message}
          {...register("idusuario", { valueAsNumber: true })}
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-dark dark:text-white">
            Motivo
          </label>
          <textarea
            className="w-full rounded-lg border border-stroke bg-transparent px-3 py-1.5 text-sm text-dark outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:focus:border-primary"
            rows={3}
            {...register("motivo")}
          />
          {errors.motivo && (
            <div className="mt-1 text-xs text-red-600 dark:text-red-400">
              {errors.motivo.message}
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

