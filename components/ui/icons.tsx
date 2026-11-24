// Streamline Core icons. Copyright Streamline. CC BY 4.0. https://www.streamlinehq.com
import type { SVGProps } from "react";
type Props = SVGProps<SVGSVGElement> & { size?: number };
function icon(body: string, rotate = 0, navigation = false) {
  return function StreamlineIcon({
    size = 24,
    style,
    strokeWidth,
    ...props
  }: Props) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={navigation ? "-1 -1 16 16" : "0 0 14 14"}
        width={navigation ? Math.max(24, size) : size}
        height={navigation ? Math.max(24, size) : size}
        fill="none"
        strokeWidth={navigation ? 2.4 : strokeWidth === 0 ? 0 : (strokeWidth ?? 1.35)}
        aria-hidden="true"
        focusable="false"
        style={{
          ...style,
          ...(navigation ? {minWidth:24,minHeight:24,flexShrink:0} : {}),
          ...(rotate ? { transform: `rotate(${rotate}deg)` } : {}),
        }}
        {...props}
        dangerouslySetInnerHTML={{ __html: body }}
      />
    );
  };
}
export const Sun = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M7 8.998a1.998 1.998 0 1 0 0-3.996a1.998 1.998 0 0 0 0 3.996M7 .5v1m0 11v1M13.5 7h-1m-11 0h-1m11.1-4.6l-.71.71m-7.78 7.78l-.71.71m9.2 0l-.71-.71M3.11 3.11L2.4 2.4"/>',
  0,
);
export const BookOpen = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M7 13.5a9.26 9.26 0 0 0-5.61-2.95a1 1 0 0 1-.89-1V1.5A1 1 0 0 1 1.64.51A9.3 9.3 0 0 1 7 3.43zm0 0a9.26 9.26 0 0 1 5.61-2.95a1 1 0 0 0 .89-1V1.5a1 1 0 0 0-1.14-.99A9.3 9.3 0 0 0 7 3.43z"/>',
  0,
);
export const Heart = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M7.004 12.383L1.53 7.424c-2.975-2.975 1.398-8.688 5.474-4.066c4.076-4.622 8.43 1.11 5.475 4.066z"/>',
  0,
);
export const Users = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M5 6.5a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5m-4.5 7h9v-.542A4.51 4.51 0 0 0 4.796 8.5A4.51 4.51 0 0 0 .5 12.958zm8.5-7a2.5 2.5 0 0 0 0-5m2.5 12h2v-.542A4.51 4.51 0 0 0 10 8.61"/>',
  0,
);
export const Gamepad2 = icon(
  '<g fill="none" stroke="currentColor" stroke-linejoin="round"><path stroke-linecap="round" d="M4.4 5.02v2.31m1.156-1.155H3.245"/><path d="m1.256 5.212l-.412 3.71a2.283 2.283 0 0 0 4.311 1.273l.36-.72h2.97l.36.72a2.283 2.283 0 0 0 4.31-1.273l-.411-3.71a3 3 0 0 0-2.982-2.669H4.238a3 3 0 0 0-2.982 2.669Z"/><path stroke-linecap="round" d="M10.466 5.514a.248.248 0 0 1 0-.495m0 .495a.248.248 0 1 0 0-.495M8.733 6.752a.248.248 0 0 1 .495 0m-.495 0a.248.248 0 1 0 .495 0"/></g>',
  0,
);
export const Images = icon(
  '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 13.5h11a1 1 0 0 0 1-1v-11a1 1 0 0 0-1-1h-11a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1"/><path d="m1.75 13.5l7.3-6.88a.5.5 0 0 1 .64 0l3.81 2.73M4.5 6a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3"/></g>',
  0,
);
export const Bell = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M6 13.25h2m3-7.5a4 4 0 1 0-8 0v3.5a1.5 1.5 0 0 1-1.5 1.5h11a1.5 1.5 0 0 1-1.5-1.5zM.5 5.62A6 6 0 0 1 3 .75m10.5 4.87A6 6 0 0 0 11 .75"/>',
  0,
);
export const Settings = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="m5.23 2.25l.43-1.11A1 1 0 0 1 6.59.5h.82a1 1 0 0 1 .93.64l.43 1.11l1.46.84l1.18-.18a1 1 0 0 1 1 .49l.4.7a1 1 0 0 1-.08 1.13l-.73.93v1.68l.75.93a1 1 0 0 1 .08 1.13l-.4.7a1 1 0 0 1-1 .49l-1.18-.18l-1.46.84l-.43 1.11a1 1 0 0 1-.93.64h-.84a1 1 0 0 1-.93-.64l-.43-1.11l-1.46-.84l-1.18.18a1 1 0 0 1-1-.49l-.4-.7a1 1 0 0 1 .08-1.13L2 7.84V6.16l-.75-.93a1 1 0 0 1-.08-1.13l.4-.7a1 1 0 0 1 1-.49l1.18.18zM5 7a2 2 0 1 0 4 0a2 2 0 0 0-4 0"/>',
  0,
);
export const Moon = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M8 7a7 7 0 0 1 3.44-6A6.6 6.6 0 0 0 9 .5a6.5 6.5 0 1 0 0 13a6.6 6.6 0 0 0 2.47-.5A7 7 0 0 1 8 7"/>',
  0,
);
export const Plus = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M7 .5v13M.5 6.96h13"/>',
  0,
);
export const ArrowUpRight = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M7 13.5V.5M10.5 4L7 .5L3.5 4"/>',
  45, true,
);
export const ChevronLeft = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M7 13.5V.5M10.5 4L7 .5L3.5 4"/>',
  -90, true,
);
export const ChevronRight = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M7 13.5V.5M10.5 4L7 .5L3.5 4"/>',
  90, true,
);
export const Search = icon(
  '<g fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5v2a1 1 0 0 1-1 1h-2m0-13h2a1 1 0 0 1 1 1v2m-13 0v-2a1 1 0 0 1 1-1h2m0 13h-2a1 1 0 0 1-1-1v-2"/><path d="M3.25 6.25a3 3 0 1 0 6 0a3 3 0 1 0-6 0"/><path stroke-linecap="round" stroke-linejoin="round" d="m8.5 8.5l2 2"/></g>',
  0,
);
export const Lock = icon(
  '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5.5H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1m-.5 0V4a3.5 3.5 0 1 0-7 0v1.5"/><path d="M7 10a.5.5 0 1 0 0-1a.5.5 0 0 0 0 1"/></g>',
  0,
);
export const Mic = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M3 5.18v4.14m4-4.14v4.14M5 6.07v2.36m6-3.25v4.14M9 6.07v2.36m4.5 2.07v2a1 1 0 0 1-1 1h-2m0-13h2a1 1 0 0 1 1 1v2m-13 0v-2a1 1 0 0 1 1-1h2m0 13h-2a1 1 0 0 1-1-1v-2"/>',
  0,
);
export const PenLine = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M.64 7.86c.785-1.097 3.164-4.214 5.947-5.967c2.093-1.318 4.07.422 2.537 2.174c-1.499 1.714-3.51 4.073-4.368 5.244c-.89 1.214.633 2.682 2.157 1.285c1.019-.934 2.08-2.008 3.158-2.802c1.456-1.071 2.705-.125 2.07 1.082c-.46.873-.793 1.258-1.176 1.993c-.384.734.022 1.615.603 1.69c.72.094 1.176-.423 1.791-1.228"/>',
  0,
);
export const Sparkles = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M.827 6.533L5.011 5.01L6.533.827a.497.497 0 0 1 .934 0L8.99 5.011l4.184 1.522a.497.497 0 0 1 0 .934L8.989 8.99l-1.522 4.184a.497.497 0 0 1-.934 0L5.01 8.989L.827 7.467a.497.497 0 0 1 0-.934"/>',
  0,
);
export const Check = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="m.5 8.55l2.73 3.51a1 1 0 0 0 1.56.03L13.5 1.55"/>',
  0,
);
export const Leaf = icon(
  '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M11.51 5.391c2 2.817.47 6.043-.27 7.301a1.42 1.42 0 0 1-1 .66c-1.45.25-5.06.529-7-2.288c-1.91-2.656-1.83-7.33-1.66-9.558A1.048 1.048 0 0 1 3 .568c2.15.619 6.63 2.167 8.51 4.823"/><path d="M4.77 4.463a52 52 0 0 1 6 8.719"/></g>',
  0,
);
export const Coffee = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M3 5.5h5a1 1 0 0 1 1 1v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5a1 1 0 0 1 1-1m6 1h.5a2.5 2.5 0 0 1 0 5H9M4 .5v2m3-2v2"/>',
  0,
);
export const Utensils = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M8.5 13.5V.5c4 2 4.5 7.5 4.5 9.5H8.5M3.5.5v13M6 .5V3a2.5 2.5 0 0 1-2.5 2.5v0A2.5 2.5 0 0 1 1 3V.5"/>',
  0,
);
export const MoreHorizontal = icon(
  '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13.5a6.5 6.5 0 1 0 0-13a6.5 6.5 0 0 0 0 13"/><path d="M4 7.25a.25.25 0 0 1 0-.5m0 .5a.25.25 0 0 0 0-.5m3 .5a.25.25 0 0 1 0-.5m0 .5a.25.25 0 0 0 0-.5m3 .5a.25.25 0 0 1 0-.5m0 .5a.25.25 0 1 0 0-.5"/></g>',
  0,
);
export const LogOut = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M9.5 10.5v2a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v2M6.5 7h7m-2-2l2 2l-2 2"/>',
  0,
);
export const CalendarDays = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M1.5 2a1 1 0 0 0-1 1v9.5a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1h-2M.5 5.5h13m-10-5v3m7-3v3M3.5 2h5"/>',
  0,
);
export const X = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M7 .5v13M.5 6.96h13"/>',
  45, true,
);
export const Upload = icon(
  '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 13.5h-2a1 1 0 0 1-1-1v-8h13v8a1 1 0 0 1-1 1h-2"/><path d="M4.5 10L7 7.5L9.5 10M7 7.5v6M11.29 1a1 1 0 0 0-.84-.5h-6.9a1 1 0 0 0-.84.5L.5 4.5h13zM7 .5v4"/></g>',
  0,
);
export const Trash2 = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="m13.5.5l-13 13m0-13l13 13"/>',
  0,
);
export const RefreshCw = icon(
  '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 .5L11.5 3L9 5.5"/><path d="M.5 6V4a1 1 0 0 1 1-1h10M5 13.5L2.5 11L5 8.5"/><path d="M13.5 8v2a1 1 0 0 1-1 1h-10"/></g>',
  0,
);
export const RotateCcw = icon(
  '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 .5L11.5 3L9 5.5"/><path d="M.5 6V4a1 1 0 0 1 1-1h10M5 13.5L2.5 11L5 8.5"/><path d="M13.5 8v2a1 1 0 0 1-1 1h-10"/></g>',
  0,
);
export const Square = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M12.5.5h-11a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-11a1 1 0 0 0-1-1"/>',
  0,
);
export const Pause = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M4 .5H1.5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1H4a1 1 0 0 0 1-1v-11a1 1 0 0 0-1-1m8.5 0H10a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-11a1 1 0 0 0-1-1"/>',
  0,
);
export const Play = icon(
  '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M1.436 12.33a1.14 1.14 0 0 0 .63 1a1.24 1.24 0 0 0 1.22 0l8.65-5.35a1.11 1.11 0 0 0 0-2L3.286.67a1.24 1.24 0 0 0-1.22 0a1.14 1.14 0 0 0-.63 1z"/>',
  0,
);

export function Copy({ size = 24, ...props }: Props) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><rect x="8" y="8" width="13" height="13" rx="3"/><path d="M15 4V3H6a3 3 0 0 0-3 3v9h1"/></svg>; }
export function Share2({ size = 24, ...props }: Props) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M12 15V3m-4 4 4-4 4 4M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>; }
