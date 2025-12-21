/**
 * MOCK DEL REPOSITORIO DE PRÉSTAMOS
 * 
 * Mock para usar en tests unitarios de servicios.
 * 
 * NOTA: Este archivo requiere @types/jest para compilar correctamente.
 * Se puede instalar con: npm install --save-dev @types/jest
 */

// @ts-nocheck - Ignorar errores de TypeScript hasta que se instalen los tipos de jest
import type { IPrestamoRepository } from "@/lib/repositories/interfaces/prestamo.repository";

export function createMockPrestamoRepository(): jest.Mocked<IPrestamoRepository> {
  return {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    findByEstado: jest.fn(),
    findByCliente: jest.fn(),
    findByGestor: jest.fn(),
  };
}

