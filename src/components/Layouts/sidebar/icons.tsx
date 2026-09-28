import type { SVGProps } from "react";

export type PropsType = SVGProps<SVGSVGElement>;

function SidebarIcon({ children, ...props }: PropsType) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function Inbox(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <path d="M4 4h16v12H4z" />
      <path d="M4 13h4l2 3h4l2-3h4" />
    </SidebarIcon>
  );
}
export function ClipboardCheck(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5h6v3H9zM9 13l2 2 4-4" />
    </SidebarIcon>
  );
}
export function Wallet(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <path d="M4 7a2 2 0 012-2h12a2 2 0 012 2v12H6a2 2 0 01-2-2V7z" />
      <path d="M4 8h14v5h-4a2 2 0 000 4h4v2M14 15h.01" />
    </SidebarIcon>
  );
}
export function Megaphone(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <path d="M4 14h3l8 4V6l-8 4H4zM7 14l1 5h3l-1-4" />
    </SidebarIcon>
  );
}
export function Wand(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <path d="M4 20L17 7l-3-3L1 17zM13 5l2-2M18 10l3-3M19 15h3M9 2v3" />
    </SidebarIcon>
  );
}
export function MessageAlert(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <path d="M20 15a3 3 0 01-3 3H9l-5 3V7a3 3 0 013-3h10a3 3 0 013 3z" />
      <path d="M12 8v3M12 14h.01" />
    </SidebarIcon>
  );
}
export function Brain(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <path d="M9 4a3 3 0 00-5 2 3 3 0 00-1 5 3 3 0 001 5 3 3 0 005 2M15 4a3 3 0 015 2 3 3 0 011 5 3 3 0 01-1 5 3 3 0 01-5 2M12 3v18M8 8h4M12 14h4" />
    </SidebarIcon>
  );
}
export function Users(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-1a5 5 0 015-5h2a5 5 0 015 5v1M16 5a3 3 0 010 6M21 20v-1a5 5 0 00-3-4.6" />
    </SidebarIcon>
  );
}
export function Trophy(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <path d="M8 4h8v5a4 4 0 01-8 0zM8 6H4v1a4 4 0 004 4M16 6h4v1a4 4 0 01-4 4M12 13v4M8 21h8M9 17h6" />
    </SidebarIcon>
  );
}
export function Building(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <path d="M4 21V5l8-3 8 3v16M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M10 21v-4h4v4" />
    </SidebarIcon>
  );
}
export function Upload(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <path d="M12 15V3M8 7l4-4 4 4M5 14v5h14v-5" />
    </SidebarIcon>
  );
}
export function History(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.7L3 8" />
      <path d="M3 3v5h5M12 7v5l3 2" />
    </SidebarIcon>
  );
}
export function UserCheck(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-1a5 5 0 015-5h2a5 5 0 013.6 1.5M16 19l2 2 4-5" />
    </SidebarIcon>
  );
}
export function LayoutTemplate(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 9v11" />
    </SidebarIcon>
  );
}
export function MessageSquare(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <path d="M20 15a3 3 0 01-3 3H9l-5 3V7a3 3 0 013-3h10a3 3 0 013 3z" />
      <path d="M8 9h8M8 13h5" />
    </SidebarIcon>
  );
}
export function Landmark(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <path d="M3 21h18M5 18h14M4 8l8-5 8 5M6 10v6M10 10v6M14 10v6M18 10v6" />
    </SidebarIcon>
  );
}
export function Receipt(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" />
    </SidebarIcon>
  );
}
export function Bank(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <path d="M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18M2 7l10-4 10 4" />
    </SidebarIcon>
  );
}
export function CalendarCheck(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M3 10h18M9 16l2 2 4-4" />
    </SidebarIcon>
  );
}

export function ChartReport(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <path d="M4 20V4h16v16zM8 16v-3M12 16V9M16 16v-5" />
    </SidebarIcon>
  );
}

export function Server(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <rect x="4" y="4" width="16" height="6" rx="1" />
      <rect x="4" y="14" width="16" height="6" rx="1" />
      <path d="M8 7h.01M8 17h.01M12 7h4M12 17h4" />
    </SidebarIcon>
  );
}

export function ShieldCheck(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <path d="M12 3l7 3v5c0 4.5-2.9 8-7 10-4.1-2-7-5.5-7-10V6zM9 12l2 2 4-4" />
    </SidebarIcon>
  );
}

export function Clock(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </SidebarIcon>
  );
}

export function UsersKey(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <circle cx="8" cy="8" r="3" />
      <path d="M2 20v-1a5 5 0 015-5h2a5 5 0 014 2M16 8h5M18 6v4M16 19h5M18.5 16.5a2.5 2.5 0 010 5" />
    </SidebarIcon>
  );
}

export function BookOpen(props: PropsType) {
  return (
    <SidebarIcon {...props}>
      <path d="M3 5.5A2.5 2.5 0 015.5 3H11v17H5.5A2.5 2.5 0 003 22zM21 5.5A2.5 2.5 0 0018.5 3H13v17h5.5A2.5 2.5 0 0121 22z" />
    </SidebarIcon>
  );
}

export function ChevronUp(props: PropsType) {
  return (
    <svg
      width={16}
      height={8}
      viewBox="0 0 16 8"
      fill="currentColor"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.553.728a.687.687 0 01.895 0l6.416 5.5a.688.688 0 01-.895 1.044L8 2.155 2.03 7.272a.688.688 0 11-.894-1.044l6.417-5.5z"
      />
    </svg>
  );
}

export function HomeIcon(props: PropsType) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M9 17.25a.75.75 0 000 1.5h6a.75.75 0 000-1.5H9z" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1.25c-.725 0-1.387.2-2.11.537-.702.327-1.512.81-2.528 1.415l-1.456.867c-1.119.667-2.01 1.198-2.686 1.706C2.523 6.3 2 6.84 1.66 7.551c-.342.711-.434 1.456-.405 2.325.029.841.176 1.864.36 3.146l.293 2.032c.237 1.65.426 2.959.707 3.978.29 1.05.702 1.885 1.445 2.524.742.64 1.63.925 2.716 1.062 1.056.132 2.387.132 4.066.132h2.316c1.68 0 3.01 0 4.066-.132 1.086-.137 1.974-.422 2.716-1.061.743-.64 1.155-1.474 1.445-2.525.281-1.02.47-2.328.707-3.978l.292-2.032c.185-1.282.332-2.305.36-3.146.03-.87-.062-1.614-.403-2.325C22 6.84 21.477 6.3 20.78 5.775c-.675-.508-1.567-1.039-2.686-1.706l-1.456-.867c-1.016-.605-1.826-1.088-2.527-1.415-.724-.338-1.386-.537-2.111-.537zM8.096 4.511c1.057-.63 1.803-1.073 2.428-1.365.609-.284 1.047-.396 1.476-.396.43 0 .867.112 1.476.396.625.292 1.37.735 2.428 1.365l1.385.825c1.165.694 1.986 1.184 2.59 1.638.587.443.91.809 1.11 1.225.199.416.282.894.257 1.626-.026.75-.16 1.691-.352 3.026l-.28 1.937c-.246 1.714-.422 2.928-.675 3.845-.247.896-.545 1.415-.977 1.787-.433.373-.994.593-1.925.71-.951.119-2.188.12-3.93.12h-2.213c-1.743 0-2.98-.001-3.931-.12-.93-.117-1.492-.337-1.925-.71-.432-.372-.73-.891-.977-1.787-.253-.917-.43-2.131-.676-3.845l-.279-1.937c-.192-1.335-.326-2.277-.352-3.026-.025-.732.058-1.21.258-1.626.2-.416.521-.782 1.11-1.225.603-.454 1.424-.944 2.589-1.638l1.385-.825z"
      />
    </svg>
  );
}

export function Calendar(props: PropsType) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path
        d="M17 14a1 1 0 100-2 1 1 0 000 2zM17 18a1 1 0 100-2 1 1 0 000 2zM13 13a1 1 0 11-2 0 1 1 0 012 0zM13 17a1 1 0 11-2 0 1 1 0 012 0zM7 14a1 1 0 100-2 1 1 0 000 2zM7 18a1 1 0 100-2 1 1 0 000 2z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 1.75a.75.75 0 01.75.75v.763c.662-.013 1.391-.013 2.193-.013h4.113c.803 0 1.532 0 2.194.013V2.5a.75.75 0 011.5 0v.827c.26.02.506.045.739.076 1.172.158 2.121.49 2.87 1.238.748.749 1.08 1.698 1.238 2.87.153 1.14.153 2.595.153 4.433v2.112c0 1.838 0 3.294-.153 4.433-.158 1.172-.49 2.121-1.238 2.87-.749.748-1.698 1.08-2.87 1.238-1.14.153-2.595.153-4.433.153H9.944c-1.838 0-3.294 0-4.433-.153-1.172-.158-2.121-.49-2.87-1.238-.748-.749-1.08-1.698-1.238-2.87-.153-1.14-.153-2.595-.153-4.433v-2.112c0-1.838 0-3.294.153-4.433.158-1.172.49-2.121 1.238-2.87.749-.748 1.698-1.08 2.87-1.238.233-.031.48-.056.739-.076V2.5A.75.75 0 017 1.75zM5.71 4.89c-1.005.135-1.585.389-2.008.812-.423.423-.677 1.003-.812 2.009-.023.17-.042.35-.058.539h18.336c-.016-.19-.035-.369-.058-.54-.135-1.005-.389-1.585-.812-2.008-.423-.423-1.003-.677-2.009-.812-1.027-.138-2.382-.14-4.289-.14h-4c-1.907 0-3.261.002-4.29.14zM2.75 12c0-.854 0-1.597.013-2.25h18.474c.013.653.013 1.396.013 2.25v2c0 1.907-.002 3.262-.14 4.29-.135 1.005-.389 1.585-.812 2.008-.423.423-1.003.677-2.009.812-1.027.138-2.382.14-4.289.14h-4c-1.907 0-3.261-.002-4.29-.14-1.005-.135-1.585-.389-2.008-.812-.423-.423-.677-1.003-.812-2.009-.138-1.027-.14-2.382-.14-4.289v-2z"
        fill="currentColor"
      />
    </svg>
  );
}

export function User(props: PropsType) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 1.25a4.75 4.75 0 100 9.5 4.75 4.75 0 000-9.5zM8.75 6a3.25 3.25 0 116.5 0 3.25 3.25 0 01-6.5 0zM12 12.25c-2.313 0-4.445.526-6.024 1.414C4.42 14.54 3.25 15.866 3.25 17.5v.102c-.001 1.162-.002 2.62 1.277 3.662.629.512 1.51.877 2.7 1.117 1.192.242 2.747.369 4.773.369s3.58-.127 4.774-.369c1.19-.24 2.07-.605 2.7-1.117 1.279-1.042 1.277-2.5 1.276-3.662V17.5c0-1.634-1.17-2.96-2.725-3.836-1.58-.888-3.711-1.414-6.025-1.414zM4.75 17.5c0-.851.622-1.775 1.961-2.528 1.316-.74 3.184-1.222 5.29-1.222 2.104 0 3.972.482 5.288 1.222 1.34.753 1.961 1.677 1.961 2.528 0 1.308-.04 2.044-.724 2.6-.37.302-.99.597-2.05.811-1.057.214-2.502.339-4.476.339-1.974 0-3.42-.125-4.476-.339-1.06-.214-1.68-.509-2.05-.81-.684-.557-.724-1.293-.724-2.601z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Alphabet(props: PropsType) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M2.25 7A.75.75 0 013 6.25h10a.75.75 0 010 1.5H3A.75.75 0 012.25 7zm14.25-.75a.75.75 0 01.684.442l4.5 10a.75.75 0 11-1.368.616l-1.437-3.194H14.12l-1.437 3.194a.75.75 0 11-1.368-.616l4.5-10a.75.75 0 01.684-.442zm-1.704 6.364h3.408L16.5 8.828l-1.704 3.786zM2.25 12a.75.75 0 01.75-.75h7a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75zm0 5a.75.75 0 01.75-.75h5a.75.75 0 010 1.5H3a.75.75 0 01-.75-.75z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Table(props: PropsType) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M18.29 4.89c-1.028-.138-2.383-.14-4.29-.14h-4c-1.907 0-3.261.002-4.29.14-1.005.135-1.585.389-2.008.812-.423.423-.677 1.003-.812 2.009-.138 1.028-.14 2.382-.14 4.289 0 1.907.002 3.261.14 4.29.135 1.005.389 1.585.812 2.008.423.423 1.003.677 2.009.812 1.028.138 2.382.14 4.289.14h4c1.907 0 3.262-.002 4.29-.14 1.005-.135 1.585-.389 2.008-.812.423-.423.677-1.003.812-2.009.138-1.028.14-2.382.14-4.289 0-1.907-.002-3.261-.14-4.29-.135-1.005-.389-1.585-.812-2.008-.423-.423-1.003-.677-2.009-.812zm.199-1.487c1.172.158 2.121.49 2.87 1.238.748.749 1.08 1.698 1.238 2.87.153 1.14.153 2.595.153 4.433v.112c0 1.838 0 3.294-.153 4.433-.158 1.172-.49 2.121-1.238 2.87-.749.748-1.698 1.08-2.87 1.238-1.14.153-2.595.153-4.433.153H9.944c-1.838 0-3.294 0-4.433-.153-1.172-.158-2.121-.49-2.87-1.238-.748-.749-1.08-1.698-1.238-2.87-.153-1.14-.153-2.595-.153-4.433v-.112c0-1.838 0-3.294.153-4.433.158-1.172.49-2.121 1.238-2.87.749-.748 1.698-1.08 2.87-1.238 1.14-.153 2.595-.153 4.433-.153h4.112c1.838 0 3.294 0 4.433.153zM8.25 17a.75.75 0 01.75-.75h6a.75.75 0 010 1.5H9a.75.75 0 01-.75-.75z"
      />
    </svg>
  );
}

export function PieChart(props: PropsType) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M14.254 1.365c-1.096-.306-2.122.024-2.851.695-.719.66-1.153 1.646-1.153 2.7v6.695a2.295 2.295 0 002.295 2.295h6.694c1.055 0 2.042-.434 2.701-1.153.67-.729 1.001-1.755.695-2.851a12.102 12.102 0 00-8.38-8.381zM11.75 4.76c0-.652.27-1.232.668-1.597.386-.355.886-.508 1.433-.355 3.55.991 6.349 3.79 7.34 7.34.153.548 0 1.048-.355 1.434-.365.397-.945.667-1.597.667h-6.694a.795.795 0 01-.795-.795V4.761z"
        fill="currentColor"
      />
      <path
        d="M8.672 4.716a.75.75 0 00-.45-1.432C4.183 4.554 1.25 8.328 1.25 12.79c0 5.501 4.46 9.961 9.96 9.961 4.462 0 8.236-2.932 9.505-6.973a.75.75 0 10-1.43-.45 8.465 8.465 0 01-8.074 5.923 8.46 8.46 0 01-8.461-8.46 8.465 8.465 0 015.922-8.074z"
        fill="currentColor"
      />
    </svg>
  );
}

export function FourCircle(props: PropsType) {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.5 1.75a4.75 4.75 0 100 9.5 4.75 4.75 0 000-9.5zM3.25 6.5a3.25 3.25 0 116.5 0 3.25 3.25 0 01-6.5 0zM17.5 12.75a4.75 4.75 0 100 9.5 4.75 4.75 0 000-9.5zm-3.25 4.75a3.25 3.25 0 116.5 0 3.25 3.25 0 01-6.5 0zM12.75 6.5a4.75 4.75 0 119.5 0 4.75 4.75 0 01-9.5 0zm4.75-3.25a3.25 3.25 0 100 6.5 3.25 3.25 0 000-6.5zM6.5 12.75a4.75 4.75 0 100 9.5 4.75 4.75 0 000-9.5zM3.25 17.5a3.25 3.25 0 116.5 0 3.25 3.25 0 01-6.5 0z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Authentication(props: PropsType) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      <path d="M14.945 1.25c-1.367 0-2.47 0-3.337.117-.9.12-1.658.38-2.26.981-.524.525-.79 1.17-.929 1.928-.135.737-.161 1.638-.167 2.72a.75.75 0 001.5.008c.006-1.093.034-1.868.142-2.457.105-.566.272-.895.515-1.138.277-.277.666-.457 1.4-.556.755-.101 1.756-.103 3.191-.103h1c1.436 0 2.437.002 3.192.103.734.099 1.122.28 1.4.556.276.277.456.665.555 1.4.102.754.103 1.756.103 3.191v8c0 1.435-.001 2.436-.103 3.192-.099.734-.279 1.122-.556 1.399-.277.277-.665.457-1.399.556-.755.101-1.756.103-3.192.103h-1c-1.435 0-2.436-.002-3.192-.103-.733-.099-1.122-.28-1.399-.556-.243-.244-.41-.572-.515-1.138-.108-.589-.136-1.364-.142-2.457a.75.75 0 10-1.5.008c.006 1.082.032 1.983.167 2.72.14.758.405 1.403.93 1.928.601.602 1.36.86 2.26.982.866.116 1.969.116 3.336.116h1.11c1.368 0 2.47 0 3.337-.116.9-.122 1.658-.38 2.26-.982.602-.602.86-1.36.982-2.26.116-.867.116-1.97.116-3.337v-8.11c0-1.367 0-2.47-.116-3.337-.121-.9-.38-1.658-.982-2.26-.602-.602-1.36-.86-2.26-.981-.867-.117-1.97-.117-3.337-.117h-1.11z" />
      <path d="M2.001 11.249a.75.75 0 000 1.5h11.973l-1.961 1.68a.75.75 0 10.976 1.14l3.5-3a.75.75 0 000-1.14l-3.5-3a.75.75 0 00-.976 1.14l1.96 1.68H2.002z" />
    </svg>
  );
}

export function ArrowLeftIcon(props: PropsType) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="currentColor"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.89775 4.10225C8.11742 4.32192 8.11742 4.67808 7.89775 4.89775L4.358 8.4375H15C15.3107 8.4375 15.5625 8.68934 15.5625 9C15.5625 9.31066 15.3107 9.5625 15 9.5625H4.358L7.89775 13.1023C8.11742 13.3219 8.11742 13.6781 7.89775 13.8977C7.67808 14.1174 7.32192 14.1174 7.10225 13.8977L2.60225 9.39775C2.38258 9.17808 2.38258 8.82192 2.60225 8.60225L7.10225 4.10225C7.32192 3.88258 7.67808 3.88258 7.89775 4.10225Z"
        fill=""
      />
    </svg>
  );
}

export function Settings(props: PropsType) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.594 3.94c.38-.38.893-.59 1.414-.59h2c.521 0 1.034.21 1.414.59l1.83 1.83c.38.38.59.893.59 1.414v2c0 .521.21 1.034.59 1.414l1.83 1.83c.38.38.59.893.59 1.414v2c0 .521-.21 1.034-.59 1.414l-1.83 1.83c-.38.38-.893.59-1.414.59h-2c-.521 0-1.034.21-1.414.59l-1.83 1.83c-.38.38-.893.59-1.414.59h-2c-.521 0-1.034-.21-1.414-.59l-1.83-1.83a2 2 0 01-.59-1.414v-2a2 2 0 00-.59-1.414l-1.83-1.83a2 2 0 010-2.828l1.83-1.83a2 2 0 011.414-.59h2c.521 0 1.034-.21 1.414-.59l1.83-1.83zm1.414 1.06a.5.5 0 00-.354.146L9.354 6.768a.5.5 0 01-.354.146H6.536a.5.5 0 00-.354.146L4.354 8.536a.5.5 0 000 .707l1.828 1.829a.5.5 0 00.354.146h2.464a.5.5 0 01.354.146l1.828 1.829a.5.5 0 00.354.146h2.464a.5.5 0 00.354-.146l1.828-1.829a.5.5 0 01.354-.146h2.464a.5.5 0 00.354-.146l1.828-1.829a.5.5 0 000-.707l-1.828-1.829a.5.5 0 00-.354-.146h-2.464a.5.5 0 01-.354-.146L14.536 4.354a.5.5 0 00-.354-.146h-2.464a.5.5 0 00-.354.146z"
        fill="currentColor"
      />
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" fill="currentColor" />
    </svg>
  );
}
