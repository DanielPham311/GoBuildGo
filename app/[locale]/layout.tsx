// placeholder — middleware redirects to default locale
// actual layout is in ../layout.tsx

import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n/config";

export default function LocaleLayout() {
  redirect(`/${defaultLocale}`);
}
