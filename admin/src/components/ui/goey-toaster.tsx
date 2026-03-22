"use client";

import type { GooeyToasterProps } from "goey-toast";
import { GooeyToaster as GoeyToasterPrimitive, gooeyToast } from "goey-toast";
import "goey-toast/styles.css";
import { useTheme } from "@/components/ThemeProvider";

export { gooeyToast };
export type { GooeyToasterProps };

function GoeyToaster(props: Omit<GooeyToasterProps, "theme">) {
  const { currentThemeMeta } = useTheme();
  return (
    <GoeyToasterPrimitive
      position="bottom-right"
      preset="smooth"
      bounce={0.3}
      theme={currentThemeMeta.isDark ? "dark" : "light"}
      {...props}
    />
  );
}

export { GoeyToaster };
