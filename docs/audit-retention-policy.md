# Retención de auditoría

Los eventos comienzan en estado `HOT`. La aplicación no marca eventos como archivados ni como elegibles para purga: no hay un almacenamiento WORM configurado y sería inseguro simularlo. Un proceso externo debe persistir, verificar y registrar URI/fecha antes de pasar por `PENDING_ARCHIVE`, `ARCHIVED` y finalmente `PURGE_ALLOWED`.

La purga programada solo considera eventos `PURGE_ALLOWED` con URI y fecha de archivado; por defecto no elimina eventos financieros.
