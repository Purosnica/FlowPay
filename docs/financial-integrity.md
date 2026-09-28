# Integridad financiera

`ejecutarChequeoIntegridadFinanciera` es estrictamente de lectura. Comprueba saldo materializado frente al ledger y detecta pagos aplicados sin movimiento. No corrige inconsistencias; los resultados requieren investigación y un movimiento explícito aprobado.

Después del despliegue y backfill, ejecútese contra MySQL representativo antes de habilitar cualquier decisión operativa basada en el ledger.
