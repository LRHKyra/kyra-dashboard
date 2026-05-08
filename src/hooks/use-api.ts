import useSWR, { SWRConfiguration } from "swr";
import { withBasePath } from "@/lib/base-path";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
});

export function useApi<T>(url: string | null, config?: SWRConfiguration<T>) {
  return useSWR<T>(withBasePath(url), fetcher, {
    revalidateOnFocus: false,
    ...config,
  });
}
