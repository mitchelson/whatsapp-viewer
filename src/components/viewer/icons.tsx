import type { JSX, SVGAttributes } from 'preact';

type P = SVGAttributes<SVGSVGElement>;

const base = (d: JSX.Element, props: P) => (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    {...props}
  >
    {d}
  </svg>
);

export const SearchIcon = (p: P) => base(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>, p);
export const FilterIcon = (p: P) => base(<path d="M3 5h18l-7 8.5V19l-4 2v-7.5z" />, p);
export const ImageIcon = (p: P) => base(<><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></>, p);
export const PdfIcon = (p: P) => base(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>, p);
export const FolderIcon = (p: P) => base(<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />, p);
export const CloseIcon = (p: P) => base(<path d="M18 6 6 18M6 6l12 12" />, p);
export const UpIcon = (p: P) => base(<path d="m18 15-6-6-6 6" />, p);
export const DownIcon = (p: P) => base(<path d="m6 9 6 6 6-6" />, p);
export const LeftIcon = (p: P) => base(<path d="m15 18-6-6 6-6" />, p);
export const RightIcon = (p: P) => base(<path d="m9 18 6-6-6-6" />, p);
export const DownloadIcon = (p: P) => base(<><path d="M12 3v12m0 0-4-4m4 4 4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>, p);
export const UploadIcon = (p: P) => base(<><path d="M12 15V3m0 0L8 7m4-4 4 4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>, p);
export const BanIcon = (p: P) => base(<><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>, p);
export const CameraIcon = (p: P) => base(<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>, p);
export const DocIcon = (p: P) => base(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>, p);
export const LockIcon = (p: P) => base(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>, p);
export const CalendarIcon = (p: P) => base(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>, p);
export const UserIcon = (p: P) => base(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>, p);
export const ArrowLeftIcon = (p: P) => base(<path d="M19 12H5m6-6-6 6 6 6" />, p);

export const TailIn = () => (
  <svg class="wa-tail" viewBox="0 0 8 13" aria-hidden="true">
    <path fill="currentColor" d="M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z" />
  </svg>
);

export const TailOut = () => (
  <svg class="wa-tail" viewBox="0 0 8 13" aria-hidden="true">
    <path fill="currentColor" d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" />
  </svg>
);
