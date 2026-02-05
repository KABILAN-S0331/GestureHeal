import React from 'react';

const IconBase = ({ children, className = "", color = "currentColor", ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {children}
  </svg>
);

export const ChestPainIcon = (props) => (
  <IconBase {...props}>
    <path d="M4 19v-9a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9" />
    <path d="M14.5 10.5c0-1.5-1-2.5-2-2.5s-2 1-2 2.5 1 2.5 2 4c1-1.5 2-2.5 2-4z" />
    <path d="M8 19h8" />
  </IconBase>
);

export const UserIcon = (props) => (
  <IconBase {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </IconBase>
);

export const LockIcon = (props) => (
  <IconBase {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </IconBase>
);

export const CalendarIcon = (props) => (
  <IconBase {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </IconBase>
);

export const BellIcon = (props) => (
  <IconBase {...props}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </IconBase>
);

export const BreathingIcon = (props) => (
  <IconBase {...props}>
    <path d="M6 8a4 4 0 0 1 4 4v7H7a3 3 0 0 1-3-3v-4a4 4 0 0 1 2-4z" />
    <path d="M14 8a4 4 0 0 0-4 4v7h3a3 3 0 0 0 3-3v-4a4 4 0 0 0-2-4z" />
    <path d="M12 4v8" />
    <path d="M10 2l2 2 2-2" />
  </IconBase>
);

export const HeadacheIcon = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="7" />
    <path d="M12 19v3" />
    <path d="M12 5V2" />
    <path d="M5 12H2" />
    <path d="M22 12h-3" />
    <path d="M17 7l2-2" />
    <path d="M7 7L5 5" />
  </IconBase>
);

export const NauseaIcon = (props) => (
  <IconBase {...props}>
    <path d="M8 12c-2 0-3 1.5-3 4s1 4 3 4h8c2 0 3-1.5 3-4s-1-4-3-4" />
    <path d="M10 16c1-1 3-1 4 0" />
    <path d="M8 8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm8 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
    <path d="M12 11V8" />
  </IconBase>
);

export const FeverIcon = (props) => (
  <IconBase {...props}>
    <path d="M14 14.5a2.5 2.5 0 0 0-5 0V6a2.5 2.5 0 0 1 5 0v8.5z" />
    <path d="M13 18a1.5 1.5 0 1 1-2.6 1" />
    <path d="M18 7l2-2" />
    <path d="M18 11l3-1" />
  </IconBase>
);

export const SeverePainIcon = (props) => (
  <IconBase {...props}>
    <path d="M12 2L9 9H3l6 4-2 9 8-6 6 2-5-8h5z" />
  </IconBase>
);

export const BleedingIcon = (props) => (
  <IconBase {...props}>
    <path d="M12 22a7 7 0 0 0 7-7c0-2-2-4-7-13-5 9-7 11-7 13a7 7 0 0 0 7 7z" />
    <path d="M8 15h8" />
    <path d="M12 11v8" />
  </IconBase>
);

export const DizzinessIcon = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="13" r="5" />
    <path d="M12 3a9 9 0 0 1 9 9" />
    <path d="M19 5l2 2" />
    <path d="M3 12a9 9 0 0 1 9-9" />
  </IconBase>
);

export const HeartEmergencyIcon = (props) => (
  <IconBase {...props}>
    <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428m0 0a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
    <path d="M3 13h2l2-3 4 6 2-3h2" />
  </IconBase>
);

export const EmergencyAlertIcon = (props) => (
  <IconBase {...props}>
    <path d="M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10v-2a8 8 0 0 1-8-8 8 8 0 0 1 8-8V2z" />
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v4" />
    <path d="M12 18v4" />
    <path d="M4.93 4.93l2.83 2.83" />
    <path d="M16.24 16.24l2.83 2.83" />
  </IconBase>
);

export const CameraIcon = (props) => (
  <IconBase {...props}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </IconBase>
);

export const CloseIcon = (props) => (
  <IconBase {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </IconBase>
)
