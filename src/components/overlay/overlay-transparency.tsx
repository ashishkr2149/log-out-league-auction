'use client';

import { useEffect } from 'react';

/** Forces transparent page chrome for OBS Browser Source. */
export function OverlayTransparency() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlBg = html.style.background;
    const prevBodyBg = body.style.background;
    const prevHtmlBgColor = html.style.backgroundColor;
    const prevBodyBgColor = body.style.backgroundColor;

    html.style.background = 'transparent';
    html.style.backgroundColor = 'transparent';
    body.style.background = 'transparent';
    body.style.backgroundColor = 'transparent';

    return () => {
      html.style.background = prevHtmlBg;
      html.style.backgroundColor = prevHtmlBgColor;
      body.style.background = prevBodyBg;
      body.style.backgroundColor = prevBodyBgColor;
    };
  }, []);

  return null;
}
