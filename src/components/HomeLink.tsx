"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<"a">, "href"> & { hash: string };

/**
 * Ссылка на раздел главной. На самой главной это обычный якорь (его перехватывает плавная прокрутка),
 * на внутренних страницах ведёт на главную к нужному разделу. #brief всегда открывает поп-ап на месте.
 */
export default function HomeLink({ hash, ...rest }: Props) {
  const home = usePathname() === "/";
  if (home || hash === "#brief") return <a href={hash} {...rest} />;
  return <Link href={`/${hash}`} {...rest} />;
}
