'use client';

import { useIsMobile } from '@/hooks/use-mobile';
import { createContext, useContext, useEffect, useState } from 'react';

type SidebarState = 'expanded' | 'collapsed';

type SidebarContextType = {
  state: SidebarState;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | null>(null);

export function useSidebarContext() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarContext must be used within a SidebarProvider');
  }
  return context;
}

export function SidebarProvider({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isMobile = useIsMobile();

  // En desktop el sidebar siempre permanece abierto. Solo se colapsa en móvil.
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  }, [isMobile]);

  // Red de seguridad: si por alguna razón queda cerrado en desktop, forzar apertura.
  useEffect(() => {
    if (!isMobile && !isOpen) {
      setIsOpen(true);
    }
  }, [isMobile, isOpen]);

  function toggleSidebar() {
    if (!isMobile) {
      setIsOpen(true);
      return;
    }
    setIsOpen((prev) => !prev);
  }

  function handleSetIsOpen(open: boolean) {
    if (!isMobile && !open) {
      setIsOpen(true);
      return;
    }
    setIsOpen(open);
  }

  return (
    <SidebarContext.Provider
      value={{
        state: isOpen ? 'expanded' : 'collapsed',
        isOpen,
        setIsOpen: handleSetIsOpen,
        isMobile,
        toggleSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
