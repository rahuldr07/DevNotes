"use client";

import type { GooeyToasterProps } from "goey-toast";
import {
  gooeyToast as baseToast,
  GooeyToaster as GoeyToasterPrimitive,
} from "goey-toast";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import "goey-toast/styles.css";
import { useTheme } from "@/components/ThemeProvider";

type ToastOptions = Parameters<typeof baseToast>[1];

const defaultClassNames = {
  title: "font-mono text-sm tracking-[-0.02em]",
  description: "font-mono text-xs leading-5 opacity-85",
  actionButton: "font-mono text-xs",
};

function withDefaults(options?: ToastOptions): ToastOptions {
  return {
    showProgress: true,
    duration: 4200,
    borderWidth: 1,
    ...options,
    classNames: {
      ...defaultClassNames,
      ...options?.classNames,
    },
  };
}

const gooeyToast = Object.assign(baseToast, {
  success(title: string, options?: ToastOptions) {
    return baseToast.success(
      title,
      withDefaults({
        duration: 3200,
        icon: <CheckCircle2 size={16} />,
        ...options,
      }),
    );
  },
  error(title: string, options?: ToastOptions) {
    baseToast.dismiss({ type: "error" });
    return baseToast.error(
      title,
      withDefaults({
        duration: 7200,
        icon: <XCircle size={16} />,
        ...options,
      }),
    );
  },
  warning(title: string, options?: ToastOptions) {
    return baseToast.warning(
      title,
      withDefaults({
        duration: 5600,
        icon: <AlertTriangle size={16} />,
        ...options,
      }),
    );
  },
  info(title: string, options?: ToastOptions) {
    return baseToast.info(
      title,
      withDefaults({
        icon: <Info size={16} />,
        ...options,
      }),
    );
  },
});

export { gooeyToast };
export type { GooeyToasterProps };

function GoeyToaster(props: Omit<GooeyToasterProps, "theme">) {
  const { currentThemeMeta } = useTheme();
  return (
    <GoeyToasterPrimitive
      position="bottom-right"
      preset="smooth"
      bounce={0.22}
      duration={4200}
      gap={12}
      offset="20px"
      showProgress
      theme={currentThemeMeta.isDark ? "dark" : "light"}
      {...props}
    />
  );
}

export { GoeyToaster };
