-- CreateTable
CREATE TABLE `tbl_pais` (
    `idpais` INTEGER NOT NULL AUTO_INCREMENT,
    `codepais` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idpais`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_departamento` (
    `iddepartamento` INTEGER NOT NULL AUTO_INCREMENT,
    `idpais` INTEGER NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`iddepartamento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_estadocivil` (
    `idestadocivil` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idestadocivil`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_ocupacion` (
    `idocupacion` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idocupacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_tipodocumento` (
    `idtipodocumento` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idtipodocumento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_tipopersona` (
    `idtipopersona` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idtipopersona`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_genero` (
    `idgenero` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idgenero`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_cliente` (
    `idcliente` INTEGER NOT NULL AUTO_INCREMENT,
    `primer_nombres` VARCHAR(191) NOT NULL,
    `segundo_nombres` VARCHAR(191) NULL,
    `primer_apellido` VARCHAR(191) NOT NULL,
    `segundo_apellido` VARCHAR(191) NULL,
    `fechanacimiento` DATETIME(3) NULL,
    `idtipodocumento` INTEGER NOT NULL,
    `numerodocumento` VARCHAR(191) NOT NULL,
    `fechavencimientodoc` DATETIME(3) NULL,
    `idgenero` INTEGER NULL,
    `idestadocivil` INTEGER NULL,
    `idocupacion` INTEGER NULL,
    `idtipopersona` INTEGER NOT NULL,
    `idpais` INTEGER NOT NULL,
    `iddepartamento` INTEGER NULL,
    `direccion` VARCHAR(191) NULL,
    `ciudad` VARCHAR(191) NULL,
    `codigopostal` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `celular` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `sitioweb` VARCHAR(191) NULL,
    `espep` BOOLEAN NOT NULL DEFAULT false,
    `observaciones` TEXT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tbl_cliente_numerodocumento_key`(`numerodocumento`),
    UNIQUE INDEX `tbl_cliente_email_key`(`email`),
    INDEX `tbl_cliente_numerodocumento_idx`(`numerodocumento`),
    INDEX `tbl_cliente_email_idx`(`email`),
    INDEX `tbl_cliente_idtipodocumento_idx`(`idtipodocumento`),
    INDEX `tbl_cliente_idpais_idx`(`idpais`),
    PRIMARY KEY (`idcliente`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_rol` (
    `idrol` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tbl_rol_codigo_key`(`codigo`),
    PRIMARY KEY (`idrol`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_usuario` (
    `idusuario` INTEGER NOT NULL AUTO_INCREMENT,
    `idrol` INTEGER NOT NULL,
    `idsupervisor` INTEGER NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NULL,
    `porcentajeComision` DECIMAL(5, 2) NOT NULL DEFAULT 0,
    `passwordHash` VARCHAR(191) NULL,
    `salt` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `ultimoAcceso` DATETIME(3) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tbl_usuario_email_key`(`email`),
    INDEX `tbl_usuario_idrol_idx`(`idrol`),
    INDEX `tbl_usuario_idsupervisor_idx`(`idsupervisor`),
    INDEX `tbl_usuario_email_idx`(`email`),
    INDEX `tbl_usuario_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`idusuario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_auditoria` (
    `idauditoria` INTEGER NOT NULL AUTO_INCREMENT,
    `idusuario` INTEGER NULL,
    `entidad` VARCHAR(191) NOT NULL,
    `entidadId` INTEGER NULL,
    `accion` VARCHAR(191) NOT NULL,
    `detalle` VARCHAR(191) NULL,
    `ip` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tbl_auditoria_entidad_entidadId_idx`(`entidad`, `entidadId`),
    INDEX `tbl_auditoria_idusuario_idx`(`idusuario`),
    INDEX `tbl_auditoria_createdAt_idx`(`createdAt`),
    INDEX `tbl_auditoria_accion_idx`(`accion`),
    PRIMARY KEY (`idauditoria`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_configuracion_sistema` (
    `idconfiguracion` INTEGER NOT NULL AUTO_INCREMENT,
    `clave` VARCHAR(191) NOT NULL,
    `valor` TEXT NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `categoria` VARCHAR(191) NULL,
    `idusuarioMod` INTEGER NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tbl_configuracion_sistema_clave_key`(`clave`),
    INDEX `tbl_configuracion_sistema_clave_deletedAt_idx`(`clave`, `deletedAt`),
    INDEX `tbl_configuracion_sistema_categoria_deletedAt_idx`(`categoria`, `deletedAt`),
    PRIMARY KEY (`idconfiguracion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_permiso` (
    `idpermiso` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `categoria` VARCHAR(191) NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tbl_permiso_codigo_key`(`codigo`),
    INDEX `tbl_permiso_codigo_deletedAt_idx`(`codigo`, `deletedAt`),
    INDEX `tbl_permiso_categoria_deletedAt_idx`(`categoria`, `deletedAt`),
    PRIMARY KEY (`idpermiso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_rol_permiso` (
    `idrolPermiso` INTEGER NOT NULL AUTO_INCREMENT,
    `idrol` INTEGER NOT NULL,
    `idpermiso` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_rol_permiso_idrol_idx`(`idrol`),
    INDEX `tbl_rol_permiso_idpermiso_idx`(`idpermiso`),
    UNIQUE INDEX `tbl_rol_permiso_idrol_idpermiso_key`(`idrol`, `idpermiso`),
    PRIMARY KEY (`idrolPermiso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_agencia` (
    `idagencia` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tbl_agencia_codigo_key`(`codigo`),
    INDEX `tbl_agencia_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`idagencia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_ruta` (
    `idruta` INTEGER NOT NULL AUTO_INCREMENT,
    `idagencia` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_ruta_idagencia_idx`(`idagencia`),
    PRIMARY KEY (`idruta`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_tipocredito` (
    `idtipocredito` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idtipocredito`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_modelopago` (
    `idmodelopago` INTEGER NOT NULL AUTO_INCREMENT,
    `descripcion` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`idmodelopago`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_mandante` (
    `idmandante` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `ruc` VARCHAR(191) NULL,
    `regulador` VARCHAR(191) NULL,
    `descuentoMaximo` DECIMAL(5, 2) NOT NULL DEFAULT 100,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tbl_mandante_codigo_key`(`codigo`),
    INDEX `tbl_mandante_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`idmandante`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_contrato_mandante` (
    `idcontrato` INTEGER NOT NULL AUTO_INCREMENT,
    `idmandante` INTEGER NOT NULL,
    `fechaInicio` DATETIME(3) NOT NULL,
    `fechaFin` DATETIME(3) NULL,
    `permitePagoAnticipado` BOOLEAN NOT NULL DEFAULT true,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_contrato_mandante_idmandante_idx`(`idmandante`),
    PRIMARY KEY (`idcontrato`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_comision_cobro` (
    `idcomision` INTEGER NOT NULL AUTO_INCREMENT,
    `idmandante` INTEGER NOT NULL,
    `tramoMoraMin` INTEGER NOT NULL,
    `tramoMoraMax` INTEGER NULL,
    `porcentaje` DECIMAL(5, 2) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_comision_cobro_idmandante_idx`(`idmandante`),
    PRIMARY KEY (`idcomision`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_campana` (
    `idcampana` INTEGER NOT NULL AUTO_INCREMENT,
    `idmandante` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `fechaCorte` DATETIME(3) NOT NULL,
    `fechaCarga` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estado` VARCHAR(191) NOT NULL DEFAULT 'ACTIVA',
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_campana_idmandante_estado_idx`(`idmandante`, `estado`),
    PRIMARY KEY (`idcampana`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_prestamo` (
    `idprestamo` INTEGER NOT NULL AUTO_INCREMENT,
    `idmandante` INTEGER NOT NULL,
    `idcampana` INTEGER NULL,
    `idcliente` INTEGER NOT NULL,
    `idtipocredito` INTEGER NULL,
    `idmodelopago` INTEGER NULL,
    `idruta` INTEGER NULL,
    `idagencia` INTEGER NULL,
    `idgestorAsignado` INTEGER NULL,
    `bloqueadoAsignacion` BOOLEAN NOT NULL DEFAULT false,
    `noPrestamo` VARCHAR(191) NOT NULL,
    `codigoUnico` VARCHAR(191) NOT NULL,
    `noCuenta` VARCHAR(191) NULL,
    `plazoMeses` INTEGER NULL,
    `fechaPrestamo` DATETIME(3) NULL,
    `fechaVencimiento` DATETIME(3) NULL,
    `estado` VARCHAR(191) NOT NULL,
    `moneda` VARCHAR(191) NOT NULL DEFAULT 'NIO',
    `tipoCambio` DECIMAL(10, 4) NULL,
    `saldoTotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `montoPrestamo` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `diasMora` INTEGER NOT NULL DEFAULT 0,
    `ultimaFechaPago` DATETIME(3) NULL,
    `interes` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `interesMoratorio` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `comisionCav` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `comisionInsitu` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `mantenimientoValor` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `gestionCobranza` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `seguroSvsd` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `cargosAdmin` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `devolucionSaldoFavor` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `descuentosArchivo` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `reportableCentralRiesgo` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_prestamo_idmandante_estado_idx`(`idmandante`, `estado`),
    INDEX `tbl_prestamo_idcliente_idx`(`idcliente`),
    INDEX `tbl_prestamo_idgestorAsignado_idx`(`idgestorAsignado`),
    INDEX `tbl_prestamo_idgestorAsignado_deletedAt_diasMora_idx`(`idgestorAsignado`, `deletedAt`, `diasMora`),
    INDEX `tbl_prestamo_idmandante_diasMora_deletedAt_idx`(`idmandante`, `diasMora`, `deletedAt`),
    INDEX `tbl_prestamo_idcampana_idx`(`idcampana`),
    UNIQUE INDEX `tbl_prestamo_idmandante_noPrestamo_key`(`idmandante`, `noPrestamo`),
    PRIMARY KEY (`idprestamo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_prestamo_corte` (
    `idcorte` INTEGER NOT NULL AUTO_INCREMENT,
    `idprestamo` INTEGER NOT NULL,
    `idcarga` INTEGER NULL,
    `fechaCorte` DATETIME(3) NOT NULL,
    `saldoTotal` DECIMAL(14, 2) NOT NULL,
    `diasMora` INTEGER NOT NULL,
    `estado` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tbl_prestamo_corte_idprestamo_fechaCorte_idx`(`idprestamo`, `fechaCorte`),
    INDEX `tbl_prestamo_corte_idcarga_idx`(`idcarga`),
    PRIMARY KEY (`idcorte`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_carga_cartera` (
    `idcarga` INTEGER NOT NULL AUTO_INCREMENT,
    `idmandante` INTEGER NOT NULL,
    `idcampana` INTEGER NOT NULL,
    `idusuario` INTEGER NOT NULL,
    `nombreArchivo` VARCHAR(191) NOT NULL,
    `fechaCorte` DATETIME(3) NOT NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'VIGENTE',
    `totalPrestamos` INTEGER NOT NULL DEFAULT 0,
    `prestamosNuevos` INTEGER NOT NULL DEFAULT 0,
    `prestamosActualizados` INTEGER NOT NULL DEFAULT 0,
    `prestamosSaldoCambiado` INTEGER NOT NULL DEFAULT 0,
    `prestamosErrores` INTEGER NOT NULL DEFAULT 0,
    `prestamosAusentes` INTEGER NOT NULL DEFAULT 0,
    `saldoTotal` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    `tiempoMs` INTEGER NULL,
    `resumenDiff` TEXT NULL,
    `detalleCarga` TEXT NULL,
    `motivoReversion` VARCHAR(191) NULL,
    `idusuarioReversion` INTEGER NULL,
    `fechaReversion` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tbl_carga_cartera_idmandante_estado_idx`(`idmandante`, `estado`),
    INDEX `tbl_carga_cartera_idcampana_idx`(`idcampana`),
    PRIMARY KEY (`idcarga`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_prestamo_asignacion_historial` (
    `idhistorial` INTEGER NOT NULL AUTO_INCREMENT,
    `idprestamo` INTEGER NOT NULL,
    `idgestorAnterior` INTEGER NULL,
    `idgestorNuevo` INTEGER NOT NULL,
    `idusuario` INTEGER NOT NULL,
    `motivo` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tbl_prestamo_asignacion_historial_idprestamo_createdAt_idx`(`idprestamo`, `createdAt`),
    PRIMARY KEY (`idhistorial`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_deudor_contacto` (
    `idcontacto` INTEGER NOT NULL AUTO_INCREMENT,
    `idcliente` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `valor` VARCHAR(191) NOT NULL,
    `fuente` VARCHAR(191) NOT NULL DEFAULT 'PROPORCIONADO_DEUDOR',
    `autorizado` BOOLEAN NOT NULL DEFAULT false,
    `esTercero` BOOLEAN NOT NULL DEFAULT false,
    `noContactar` BOOLEAN NOT NULL DEFAULT false,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_deudor_contacto_idcliente_idx`(`idcliente`),
    PRIMARY KEY (`idcontacto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_fiador` (
    `idfiador` INTEGER NOT NULL AUTO_INCREMENT,
    `idprestamo` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_fiador_idprestamo_idx`(`idprestamo`),
    PRIMARY KEY (`idfiador`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_codigo_accion` (
    `idcodaccion` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `esTercero` BOOLEAN NOT NULL DEFAULT false,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tbl_codigo_accion_codigo_key`(`codigo`),
    PRIMARY KEY (`idcodaccion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_codigo_resultado` (
    `idcodresultado` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `grupo` VARCHAR(191) NOT NULL,
    `tipoGestion` VARCHAR(191) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tbl_codigo_resultado_codigo_key`(`codigo`),
    PRIMARY KEY (`idcodresultado`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_mandante_tipificacion` (
    `idmt` INTEGER NOT NULL AUTO_INCREMENT,
    `idmandante` INTEGER NOT NULL,
    `idcodaccion` INTEGER NULL,
    `idcodresultado` INTEGER NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_mandante_tipificacion_idmandante_idx`(`idmandante`),
    PRIMARY KEY (`idmt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_gestion` (
    `idmandante` INTEGER NOT NULL,
    `idgestion` INTEGER NOT NULL AUTO_INCREMENT,
    `idprestamo` INTEGER NOT NULL,
    `idgestor` INTEGER NOT NULL,
    `idcodaccion` INTEGER NULL,
    `idcodresultado` INTEGER NULL,
    `fechaGestion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `telefonoContacto` VARCHAR(191) NULL,
    `contactoTercero` BOOLEAN NOT NULL DEFAULT false,
    `nota` TEXT NOT NULL,
    `razonMora` VARCHAR(191) NULL,
    `montoPromesa` DECIMAL(14, 2) NULL,
    `fechaPromesa` DATETIME(3) NULL,
    `fechaProximaGestion` DATETIME(3) NULL,
    `comentario` TEXT NULL,
    `latitud` DECIMAL(9, 6) NULL,
    `longitud` DECIMAL(9, 6) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_gestion_idmandante_fechaGestion_idx`(`idmandante`, `fechaGestion`),
    INDEX `tbl_gestion_idprestamo_idx`(`idprestamo`),
    INDEX `tbl_gestion_idgestor_idx`(`idgestor`),
    INDEX `tbl_gestion_idgestor_fechaGestion_idx`(`idgestor`, `fechaGestion`),
    INDEX `tbl_gestion_idgestor_fechaProximaGestion_deletedAt_idx`(`idgestor`, `fechaProximaGestion`, `deletedAt`),
    INDEX `tbl_gestion_idmandante_deletedAt_fechaPromesa_idx`(`idmandante`, `deletedAt`, `fechaPromesa`),
    INDEX `tbl_gestion_fechaPromesa_idx`(`fechaPromesa`),
    PRIMARY KEY (`idgestion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_politica_descuento` (
    `idpolitica` INTEGER NOT NULL AUTO_INCREMENT,
    `idmandante` INTEGER NOT NULL,
    `tramoMoraMin` INTEGER NOT NULL,
    `tramoMoraMax` INTEGER NULL,
    `porcentaje` DECIMAL(5, 2) NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_politica_descuento_idmandante_idx`(`idmandante`),
    PRIMARY KEY (`idpolitica`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_acuerdo` (
    `idacuerdo` INTEGER NOT NULL AUTO_INCREMENT,
    `idmandante` INTEGER NOT NULL,
    `idprestamo` INTEGER NOT NULL,
    `idgestion` INTEGER NULL,
    `baseNegociable` DECIMAL(14, 2) NOT NULL,
    `porcentajeDesc` DECIMAL(5, 2) NOT NULL,
    `montoDescuento` DECIMAL(14, 2) NOT NULL,
    `montoAcordado` DECIMAL(14, 2) NOT NULL,
    `dispensarInteresMoratorio` BOOLEAN NOT NULL DEFAULT false,
    `dispensarGestionCobranza` BOOLEAN NOT NULL DEFAULT false,
    `numeroCuotas` INTEGER NOT NULL DEFAULT 1,
    `montoCuota` DECIMAL(14, 2) NOT NULL,
    `pagoMinimo` DECIMAL(14, 2) NULL,
    `fechaInicio` DATETIME(3) NOT NULL,
    `estado` VARCHAR(191) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_acuerdo_idmandante_idx`(`idmandante`),
    INDEX `tbl_acuerdo_idprestamo_idx`(`idprestamo`),
    INDEX `tbl_acuerdo_estado_deletedAt_idx`(`estado`, `deletedAt`),
    PRIMARY KEY (`idacuerdo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_pago` (
    `idpago` INTEGER NOT NULL AUTO_INCREMENT,
    `idmandante` INTEGER NOT NULL,
    `idprestamo` INTEGER NOT NULL,
    `idacuerdo` INTEGER NULL,
    `idgestion` INTEGER NULL,
    `idgestor` INTEGER NULL,
    `fechaPago` DATETIME(3) NOT NULL,
    `monto` DECIMAL(14, 2) NOT NULL,
    `moneda` VARCHAR(191) NOT NULL DEFAULT 'NIO',
    `tipoCambio` DECIMAL(10, 4) NULL,
    `medio` VARCHAR(191) NULL,
    `aplicado` BOOLEAN NOT NULL DEFAULT false,
    `diasMoraAplicacion` INTEGER NULL,
    `reciboUrl` VARCHAR(191) NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_pago_idmandante_idx`(`idmandante`),
    INDEX `tbl_pago_idprestamo_idx`(`idprestamo`),
    INDEX `tbl_pago_idgestor_idx`(`idgestor`),
    INDEX `tbl_pago_fechaPago_aplicado_idx`(`fechaPago`, `aplicado`),
    INDEX `tbl_pago_idmandante_deletedAt_aplicado_fechaPago_idx`(`idmandante`, `deletedAt`, `aplicado`, `fechaPago`),
    INDEX `tbl_pago_idprestamo_fechaPago_monto_medio_idx`(`idprestamo`, `fechaPago`, `monto`, `medio`),
    PRIMARY KEY (`idpago`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_liquidacion` (
    `idliquidacion` INTEGER NOT NULL AUTO_INCREMENT,
    `idmandante` INTEGER NOT NULL,
    `periodo` VARCHAR(191) NOT NULL,
    `periodoActivo` VARCHAR(191) NULL,
    `totalRecuperado` DECIMAL(14, 2) NOT NULL,
    `totalComision` DECIMAL(14, 2) NOT NULL,
    `estado` VARCHAR(191) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_liquidacion_idmandante_idx`(`idmandante`),
    INDEX `tbl_liquidacion_idmandante_periodo_deletedAt_idx`(`idmandante`, `periodo`, `deletedAt`),
    UNIQUE INDEX `tbl_liquidacion_idmandante_periodoActivo_key`(`idmandante`, `periodoActivo`),
    PRIMARY KEY (`idliquidacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_liquidacion_detalle` (
    `iddetalle` INTEGER NOT NULL AUTO_INCREMENT,
    `idliquidacion` INTEGER NOT NULL,
    `idpago` INTEGER NOT NULL,
    `idprestamo` INTEGER NOT NULL,
    `noPrestamo` VARCHAR(191) NOT NULL,
    `monto` DECIMAL(14, 2) NOT NULL,
    `diasMora` INTEGER NOT NULL,
    `idgestor` INTEGER NULL,
    `nombreGestor` VARCHAR(191) NULL,
    `porcentajeRecuperacion` DECIMAL(5, 2) NOT NULL,
    `ingresoEmpresa` DECIMAL(14, 2) NOT NULL,
    `porcentajeComisionCobrador` DECIMAL(5, 2) NOT NULL,
    `montoComision` DECIMAL(14, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tbl_liquidacion_detalle_idliquidacion_idx`(`idliquidacion`),
    INDEX `tbl_liquidacion_detalle_idpago_idx`(`idpago`),
    PRIMARY KEY (`iddetalle`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_acuerdo_cuota` (
    `idcuota` INTEGER NOT NULL AUTO_INCREMENT,
    `idacuerdo` INTEGER NOT NULL,
    `numeroCuota` INTEGER NOT NULL,
    `montoCuota` DECIMAL(14, 2) NOT NULL,
    `fechaVencimiento` DATETIME(3) NOT NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'PENDIENTE',
    `idpago` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_acuerdo_cuota_idacuerdo_estado_idx`(`idacuerdo`, `estado`),
    UNIQUE INDEX `tbl_acuerdo_cuota_idacuerdo_numeroCuota_key`(`idacuerdo`, `numeroCuota`),
    PRIMARY KEY (`idcuota`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_prestamo_estado_historial` (
    `idhistorial` INTEGER NOT NULL AUTO_INCREMENT,
    `idprestamo` INTEGER NOT NULL,
    `estadoAnterior` VARCHAR(191) NULL,
    `estadoNuevo` VARCHAR(191) NOT NULL,
    `motivo` VARCHAR(191) NULL,
    `idusuario` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tbl_prestamo_estado_historial_idprestamo_createdAt_idx`(`idprestamo`, `createdAt`),
    PRIMARY KEY (`idhistorial`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_horario_cobranza` (
    `idhorario` INTEGER NOT NULL AUTO_INCREMENT,
    `idmandante` INTEGER NULL,
    `diaSemana` INTEGER NOT NULL,
    `horaInicio` VARCHAR(191) NOT NULL,
    `horaFin` VARCHAR(191) NOT NULL,
    `permitido` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_horario_cobranza_idmandante_idx`(`idmandante`),
    INDEX `tbl_horario_cobranza_idmandante_diaSemana_idx`(`idmandante`, `diaSemana`),
    PRIMARY KEY (`idhorario`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_dia_feriado` (
    `idferiado` INTEGER NOT NULL AUTO_INCREMENT,
    `fecha` DATETIME(3) NOT NULL,
    `descripcion` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tbl_dia_feriado_fecha_idx`(`fecha`),
    PRIMARY KEY (`idferiado`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_reclamo` (
    `idreclamo` INTEGER NOT NULL AUTO_INCREMENT,
    `idmandante` INTEGER NOT NULL,
    `idcliente` INTEGER NOT NULL,
    `idprestamo` INTEGER NULL,
    `descripcion` TEXT NOT NULL,
    `estado` VARCHAR(191) NOT NULL,
    `fechaLimite` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_reclamo_idmandante_idx`(`idmandante`),
    INDEX `tbl_reclamo_idcliente_idx`(`idcliente`),
    INDEX `tbl_reclamo_deletedAt_estado_fechaLimite_idx`(`deletedAt`, `estado`, `fechaLimite`),
    INDEX `tbl_reclamo_idmandante_estado_fechaLimite_idx`(`idmandante`, `estado`, `fechaLimite`),
    PRIMARY KEY (`idreclamo`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_documento` (
    `iddocumento` INTEGER NOT NULL AUTO_INCREMENT,
    `idprestamo` INTEGER NULL,
    `idcliente` INTEGER NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tbl_documento_idprestamo_idx`(`idprestamo`),
    INDEX `tbl_documento_idcliente_idx`(`idcliente`),
    PRIMARY KEY (`iddocumento`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_plantilla_importacion` (
    `idplantillaImp` INTEGER NOT NULL AUTO_INCREMENT,
    `idmandante` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `mapeo` TEXT NOT NULL,
    `formatoFecha` VARCHAR(191) NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_plantilla_importacion_idmandante_idx`(`idmandante`),
    PRIMARY KEY (`idplantillaImp`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_plantilla_mensaje` (
    `idplantilla` INTEGER NOT NULL AUTO_INCREMENT,
    `idmandante` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `canal` VARCHAR(191) NOT NULL,
    `etapa` VARCHAR(191) NULL,
    `contenido` TEXT NOT NULL,
    `estado` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_plantilla_mensaje_idmandante_idx`(`idmandante`),
    PRIMARY KEY (`idplantilla`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_importacion_job` (
    `idjob` INTEGER NOT NULL AUTO_INCREMENT,
    `idmandante` INTEGER NOT NULL,
    `idcampana` INTEGER NULL,
    `idusuario` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'PENDIENTE',
    `nombreArchivo` VARCHAR(191) NOT NULL,
    `rutaArchivo` VARCHAR(191) NOT NULL,
    `fechaCorte` DATETIME(3) NULL,
    `nombreHoja` VARCHAR(191) NULL,
    `idplantillaImp` INTEGER NULL,
    `progresoPct` INTEGER NOT NULL DEFAULT 0,
    `filasProcesadas` INTEGER NOT NULL DEFAULT 0,
    `filasTotales` INTEGER NOT NULL DEFAULT 0,
    `resultado` TEXT NULL,
    `error` TEXT NULL,
    `iniciadoEn` DATETIME(3) NULL,
    `finalizadoEn` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_importacion_job_estado_createdAt_idx`(`estado`, `createdAt`),
    INDEX `tbl_importacion_job_idmandante_idx`(`idmandante`),
    PRIMARY KEY (`idjob`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_cron_job` (
    `idjob` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `schedule` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `timeoutMs` INTEGER NOT NULL DEFAULT 300000,
    `maxReintentos` INTEGER NOT NULL DEFAULT 2,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `ultimaEjecucion` DATETIME(3) NULL,
    `proximaEjecucion` DATETIME(3) NULL,
    `ultimoEstado` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tbl_cron_job_codigo_key`(`codigo`),
    INDEX `tbl_cron_job_activo_orden_idx`(`activo`, `orden`),
    PRIMARY KEY (`idjob`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_cron_ejecucion` (
    `idejecucion` INTEGER NOT NULL AUTO_INCREMENT,
    `idjob` INTEGER NOT NULL,
    `idEjecucionPadre` INTEGER NULL,
    `estado` VARCHAR(191) NOT NULL,
    `intento` INTEGER NOT NULL DEFAULT 1,
    `trigger` VARCHAR(191) NOT NULL DEFAULT 'cron',
    `iniciadoEn` DATETIME(3) NOT NULL,
    `finalizadoEn` DATETIME(3) NULL,
    `duracionMs` INTEGER NULL,
    `registrosProcesados` INTEGER NOT NULL DEFAULT 0,
    `resultado` TEXT NULL,
    `error` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tbl_cron_ejecucion_idjob_iniciadoEn_idx`(`idjob`, `iniciadoEn`),
    INDEX `tbl_cron_ejecucion_estado_iniciadoEn_idx`(`estado`, `iniciadoEn`),
    INDEX `tbl_cron_ejecucion_idEjecucionPadre_idx`(`idEjecucionPadre`),
    PRIMARY KEY (`idejecucion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_rate_limit` (
    `clave` VARCHAR(191) NOT NULL,
    `ventanaInicio` DATETIME(3) NOT NULL,
    `conteo` INTEGER NOT NULL DEFAULT 1,
    `expiraEn` DATETIME(3) NOT NULL,

    INDEX `tbl_rate_limit_expiraEn_idx`(`expiraEn`),
    PRIMARY KEY (`clave`, `ventanaInicio`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_secuencia_contacto` (
    `idsecuencia` INTEGER NOT NULL AUTO_INCREMENT,
    `idcampana` INTEGER NOT NULL,
    `idmandante` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'ACTIVA',
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tbl_secuencia_contacto_idcampana_idx`(`idcampana`),
    INDEX `tbl_secuencia_contacto_idmandante_idx`(`idmandante`),
    PRIMARY KEY (`idsecuencia`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_secuencia_contacto_paso` (
    `idpaso` INTEGER NOT NULL AUTO_INCREMENT,
    `idsecuencia` INTEGER NOT NULL,
    `orden` INTEGER NOT NULL,
    `diasDesdeInicio` INTEGER NOT NULL,
    `canal` VARCHAR(191) NOT NULL,
    `accion` VARCHAR(191) NULL,
    `idplantilla` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tbl_secuencia_contacto_paso_idsecuencia_orden_key`(`idsecuencia`, `orden`),
    PRIMARY KEY (`idpaso`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_notificacion_lectura` (
    `idlectura` INTEGER NOT NULL AUTO_INCREMENT,
    `idusuario` INTEGER NOT NULL,
    `notificacionId` VARCHAR(191) NOT NULL,
    `leidaEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tbl_notificacion_lectura_idusuario_leidaEn_idx`(`idusuario`, `leidaEn`),
    UNIQUE INDEX `tbl_notificacion_lectura_idusuario_notificacionId_key`(`idusuario`, `notificacionId`),
    PRIMARY KEY (`idlectura`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_notificacion` (
    `idnotificacion` INTEGER NOT NULL AUTO_INCREMENT,
    `idusuario` INTEGER NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `severidad` VARCHAR(191) NOT NULL DEFAULT 'info',
    `titulo` VARCHAR(191) NOT NULL,
    `mensaje` TEXT NOT NULL,
    `url` VARCHAR(191) NULL,
    `entidad` VARCHAR(191) NULL,
    `entidadId` INTEGER NULL,
    `leida` BOOLEAN NOT NULL DEFAULT false,
    `leidaEn` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tbl_notificacion_idusuario_leida_createdAt_idx`(`idusuario`, `leida`, `createdAt`),
    INDEX `tbl_notificacion_idusuario_createdAt_idx`(`idusuario`, `createdAt`),
    PRIMARY KEY (`idnotificacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tbl_usuario_mandante` (
    `idum` INTEGER NOT NULL AUTO_INCREMENT,
    `idusuario` INTEGER NOT NULL,
    `idmandante` INTEGER NOT NULL,
    `porcentajeComision` DECIMAL(5, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tbl_usuario_mandante_idmandante_idx`(`idmandante`),
    INDEX `tbl_usuario_mandante_idusuario_idx`(`idusuario`),
    UNIQUE INDEX `tbl_usuario_mandante_idusuario_idmandante_key`(`idusuario`, `idmandante`),
    PRIMARY KEY (`idum`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tbl_departamento` ADD CONSTRAINT `tbl_departamento_idpais_fkey` FOREIGN KEY (`idpais`) REFERENCES `tbl_pais`(`idpais`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_cliente` ADD CONSTRAINT `tbl_cliente_idtipodocumento_fkey` FOREIGN KEY (`idtipodocumento`) REFERENCES `tbl_tipodocumento`(`idtipodocumento`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_cliente` ADD CONSTRAINT `tbl_cliente_idgenero_fkey` FOREIGN KEY (`idgenero`) REFERENCES `tbl_genero`(`idgenero`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_cliente` ADD CONSTRAINT `tbl_cliente_idestadocivil_fkey` FOREIGN KEY (`idestadocivil`) REFERENCES `tbl_estadocivil`(`idestadocivil`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_cliente` ADD CONSTRAINT `tbl_cliente_idocupacion_fkey` FOREIGN KEY (`idocupacion`) REFERENCES `tbl_ocupacion`(`idocupacion`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_cliente` ADD CONSTRAINT `tbl_cliente_idtipopersona_fkey` FOREIGN KEY (`idtipopersona`) REFERENCES `tbl_tipopersona`(`idtipopersona`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_cliente` ADD CONSTRAINT `tbl_cliente_idpais_fkey` FOREIGN KEY (`idpais`) REFERENCES `tbl_pais`(`idpais`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_cliente` ADD CONSTRAINT `tbl_cliente_iddepartamento_fkey` FOREIGN KEY (`iddepartamento`) REFERENCES `tbl_departamento`(`iddepartamento`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_usuario` ADD CONSTRAINT `tbl_usuario_idrol_fkey` FOREIGN KEY (`idrol`) REFERENCES `tbl_rol`(`idrol`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_usuario` ADD CONSTRAINT `tbl_usuario_idsupervisor_fkey` FOREIGN KEY (`idsupervisor`) REFERENCES `tbl_usuario`(`idusuario`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tbl_auditoria` ADD CONSTRAINT `tbl_auditoria_idusuario_fkey` FOREIGN KEY (`idusuario`) REFERENCES `tbl_usuario`(`idusuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_configuracion_sistema` ADD CONSTRAINT `tbl_configuracion_sistema_idusuarioMod_fkey` FOREIGN KEY (`idusuarioMod`) REFERENCES `tbl_usuario`(`idusuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_rol_permiso` ADD CONSTRAINT `tbl_rol_permiso_idrol_fkey` FOREIGN KEY (`idrol`) REFERENCES `tbl_rol`(`idrol`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_rol_permiso` ADD CONSTRAINT `tbl_rol_permiso_idpermiso_fkey` FOREIGN KEY (`idpermiso`) REFERENCES `tbl_permiso`(`idpermiso`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_ruta` ADD CONSTRAINT `tbl_ruta_idagencia_fkey` FOREIGN KEY (`idagencia`) REFERENCES `tbl_agencia`(`idagencia`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_contrato_mandante` ADD CONSTRAINT `tbl_contrato_mandante_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_comision_cobro` ADD CONSTRAINT `tbl_comision_cobro_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_campana` ADD CONSTRAINT `tbl_campana_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_prestamo` ADD CONSTRAINT `tbl_prestamo_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_prestamo` ADD CONSTRAINT `tbl_prestamo_idcampana_fkey` FOREIGN KEY (`idcampana`) REFERENCES `tbl_campana`(`idcampana`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_prestamo` ADD CONSTRAINT `tbl_prestamo_idcliente_fkey` FOREIGN KEY (`idcliente`) REFERENCES `tbl_cliente`(`idcliente`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_prestamo` ADD CONSTRAINT `tbl_prestamo_idtipocredito_fkey` FOREIGN KEY (`idtipocredito`) REFERENCES `tbl_tipocredito`(`idtipocredito`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_prestamo` ADD CONSTRAINT `tbl_prestamo_idmodelopago_fkey` FOREIGN KEY (`idmodelopago`) REFERENCES `tbl_modelopago`(`idmodelopago`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_prestamo` ADD CONSTRAINT `tbl_prestamo_idruta_fkey` FOREIGN KEY (`idruta`) REFERENCES `tbl_ruta`(`idruta`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_prestamo` ADD CONSTRAINT `tbl_prestamo_idagencia_fkey` FOREIGN KEY (`idagencia`) REFERENCES `tbl_agencia`(`idagencia`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_prestamo` ADD CONSTRAINT `tbl_prestamo_idgestorAsignado_fkey` FOREIGN KEY (`idgestorAsignado`) REFERENCES `tbl_usuario`(`idusuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_prestamo_corte` ADD CONSTRAINT `tbl_prestamo_corte_idprestamo_fkey` FOREIGN KEY (`idprestamo`) REFERENCES `tbl_prestamo`(`idprestamo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_prestamo_corte` ADD CONSTRAINT `tbl_prestamo_corte_idcarga_fkey` FOREIGN KEY (`idcarga`) REFERENCES `tbl_carga_cartera`(`idcarga`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_carga_cartera` ADD CONSTRAINT `tbl_carga_cartera_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_carga_cartera` ADD CONSTRAINT `tbl_carga_cartera_idcampana_fkey` FOREIGN KEY (`idcampana`) REFERENCES `tbl_campana`(`idcampana`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_carga_cartera` ADD CONSTRAINT `tbl_carga_cartera_idusuario_fkey` FOREIGN KEY (`idusuario`) REFERENCES `tbl_usuario`(`idusuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_prestamo_asignacion_historial` ADD CONSTRAINT `tbl_prestamo_asignacion_historial_idprestamo_fkey` FOREIGN KEY (`idprestamo`) REFERENCES `tbl_prestamo`(`idprestamo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_prestamo_asignacion_historial` ADD CONSTRAINT `tbl_prestamo_asignacion_historial_idgestorAnterior_fkey` FOREIGN KEY (`idgestorAnterior`) REFERENCES `tbl_usuario`(`idusuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_prestamo_asignacion_historial` ADD CONSTRAINT `tbl_prestamo_asignacion_historial_idgestorNuevo_fkey` FOREIGN KEY (`idgestorNuevo`) REFERENCES `tbl_usuario`(`idusuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_prestamo_asignacion_historial` ADD CONSTRAINT `tbl_prestamo_asignacion_historial_idusuario_fkey` FOREIGN KEY (`idusuario`) REFERENCES `tbl_usuario`(`idusuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_deudor_contacto` ADD CONSTRAINT `tbl_deudor_contacto_idcliente_fkey` FOREIGN KEY (`idcliente`) REFERENCES `tbl_cliente`(`idcliente`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_fiador` ADD CONSTRAINT `tbl_fiador_idprestamo_fkey` FOREIGN KEY (`idprestamo`) REFERENCES `tbl_prestamo`(`idprestamo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_mandante_tipificacion` ADD CONSTRAINT `tbl_mandante_tipificacion_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_mandante_tipificacion` ADD CONSTRAINT `tbl_mandante_tipificacion_idcodaccion_fkey` FOREIGN KEY (`idcodaccion`) REFERENCES `tbl_codigo_accion`(`idcodaccion`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_mandante_tipificacion` ADD CONSTRAINT `tbl_mandante_tipificacion_idcodresultado_fkey` FOREIGN KEY (`idcodresultado`) REFERENCES `tbl_codigo_resultado`(`idcodresultado`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_gestion` ADD CONSTRAINT `tbl_gestion_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_gestion` ADD CONSTRAINT `tbl_gestion_idprestamo_fkey` FOREIGN KEY (`idprestamo`) REFERENCES `tbl_prestamo`(`idprestamo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_gestion` ADD CONSTRAINT `tbl_gestion_idgestor_fkey` FOREIGN KEY (`idgestor`) REFERENCES `tbl_usuario`(`idusuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_gestion` ADD CONSTRAINT `tbl_gestion_idcodaccion_fkey` FOREIGN KEY (`idcodaccion`) REFERENCES `tbl_codigo_accion`(`idcodaccion`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_gestion` ADD CONSTRAINT `tbl_gestion_idcodresultado_fkey` FOREIGN KEY (`idcodresultado`) REFERENCES `tbl_codigo_resultado`(`idcodresultado`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_politica_descuento` ADD CONSTRAINT `tbl_politica_descuento_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_acuerdo` ADD CONSTRAINT `tbl_acuerdo_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_acuerdo` ADD CONSTRAINT `tbl_acuerdo_idprestamo_fkey` FOREIGN KEY (`idprestamo`) REFERENCES `tbl_prestamo`(`idprestamo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_acuerdo` ADD CONSTRAINT `tbl_acuerdo_idgestion_fkey` FOREIGN KEY (`idgestion`) REFERENCES `tbl_gestion`(`idgestion`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_pago` ADD CONSTRAINT `tbl_pago_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_pago` ADD CONSTRAINT `tbl_pago_idprestamo_fkey` FOREIGN KEY (`idprestamo`) REFERENCES `tbl_prestamo`(`idprestamo`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_pago` ADD CONSTRAINT `tbl_pago_idacuerdo_fkey` FOREIGN KEY (`idacuerdo`) REFERENCES `tbl_acuerdo`(`idacuerdo`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_pago` ADD CONSTRAINT `tbl_pago_idgestion_fkey` FOREIGN KEY (`idgestion`) REFERENCES `tbl_gestion`(`idgestion`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_pago` ADD CONSTRAINT `tbl_pago_idgestor_fkey` FOREIGN KEY (`idgestor`) REFERENCES `tbl_usuario`(`idusuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_liquidacion` ADD CONSTRAINT `tbl_liquidacion_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_liquidacion_detalle` ADD CONSTRAINT `tbl_liquidacion_detalle_idliquidacion_fkey` FOREIGN KEY (`idliquidacion`) REFERENCES `tbl_liquidacion`(`idliquidacion`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_acuerdo_cuota` ADD CONSTRAINT `tbl_acuerdo_cuota_idacuerdo_fkey` FOREIGN KEY (`idacuerdo`) REFERENCES `tbl_acuerdo`(`idacuerdo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_prestamo_estado_historial` ADD CONSTRAINT `tbl_prestamo_estado_historial_idprestamo_fkey` FOREIGN KEY (`idprestamo`) REFERENCES `tbl_prestamo`(`idprestamo`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_prestamo_estado_historial` ADD CONSTRAINT `tbl_prestamo_estado_historial_idusuario_fkey` FOREIGN KEY (`idusuario`) REFERENCES `tbl_usuario`(`idusuario`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_horario_cobranza` ADD CONSTRAINT `tbl_horario_cobranza_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_reclamo` ADD CONSTRAINT `tbl_reclamo_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_reclamo` ADD CONSTRAINT `tbl_reclamo_idcliente_fkey` FOREIGN KEY (`idcliente`) REFERENCES `tbl_cliente`(`idcliente`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_reclamo` ADD CONSTRAINT `tbl_reclamo_idprestamo_fkey` FOREIGN KEY (`idprestamo`) REFERENCES `tbl_prestamo`(`idprestamo`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_documento` ADD CONSTRAINT `tbl_documento_idprestamo_fkey` FOREIGN KEY (`idprestamo`) REFERENCES `tbl_prestamo`(`idprestamo`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_documento` ADD CONSTRAINT `tbl_documento_idcliente_fkey` FOREIGN KEY (`idcliente`) REFERENCES `tbl_cliente`(`idcliente`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_plantilla_importacion` ADD CONSTRAINT `tbl_plantilla_importacion_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_plantilla_mensaje` ADD CONSTRAINT `tbl_plantilla_mensaje_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_importacion_job` ADD CONSTRAINT `tbl_importacion_job_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_importacion_job` ADD CONSTRAINT `tbl_importacion_job_idcampana_fkey` FOREIGN KEY (`idcampana`) REFERENCES `tbl_campana`(`idcampana`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_importacion_job` ADD CONSTRAINT `tbl_importacion_job_idusuario_fkey` FOREIGN KEY (`idusuario`) REFERENCES `tbl_usuario`(`idusuario`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_cron_ejecucion` ADD CONSTRAINT `tbl_cron_ejecucion_idjob_fkey` FOREIGN KEY (`idjob`) REFERENCES `tbl_cron_job`(`idjob`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_cron_ejecucion` ADD CONSTRAINT `tbl_cron_ejecucion_idEjecucionPadre_fkey` FOREIGN KEY (`idEjecucionPadre`) REFERENCES `tbl_cron_ejecucion`(`idejecucion`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_secuencia_contacto` ADD CONSTRAINT `tbl_secuencia_contacto_idcampana_fkey` FOREIGN KEY (`idcampana`) REFERENCES `tbl_campana`(`idcampana`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_secuencia_contacto` ADD CONSTRAINT `tbl_secuencia_contacto_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_secuencia_contacto_paso` ADD CONSTRAINT `tbl_secuencia_contacto_paso_idsecuencia_fkey` FOREIGN KEY (`idsecuencia`) REFERENCES `tbl_secuencia_contacto`(`idsecuencia`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_secuencia_contacto_paso` ADD CONSTRAINT `tbl_secuencia_contacto_paso_idplantilla_fkey` FOREIGN KEY (`idplantilla`) REFERENCES `tbl_plantilla_mensaje`(`idplantilla`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_notificacion_lectura` ADD CONSTRAINT `tbl_notificacion_lectura_idusuario_fkey` FOREIGN KEY (`idusuario`) REFERENCES `tbl_usuario`(`idusuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_notificacion` ADD CONSTRAINT `tbl_notificacion_idusuario_fkey` FOREIGN KEY (`idusuario`) REFERENCES `tbl_usuario`(`idusuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_usuario_mandante` ADD CONSTRAINT `tbl_usuario_mandante_idusuario_fkey` FOREIGN KEY (`idusuario`) REFERENCES `tbl_usuario`(`idusuario`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tbl_usuario_mandante` ADD CONSTRAINT `tbl_usuario_mandante_idmandante_fkey` FOREIGN KEY (`idmandante`) REFERENCES `tbl_mandante`(`idmandante`) ON DELETE CASCADE ON UPDATE CASCADE;
