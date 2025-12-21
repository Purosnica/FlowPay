import Image from "next/image";

export function Logo() {
  return (
    <div className="relative h-8 max-w-[10.847rem]">
      <Image
        src="/images/logo/logo.png"
        fill
        alt="FlowPay logo"
        role="presentation"
        quality={90}
        sizes="(max-width: 768px) 100vw, 173px"
      />
    </div>
  );
}

