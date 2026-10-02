const DEFAULT_IMAGE_WIDTHS = [200, 400, 700, 900] as const;

export function getPropertyImageUrl(sourceUrl: string, width: number): string {
  try {
    const url = new URL(sourceUrl);
    if (!url.hostname.toLowerCase().endsWith(".staticlbi.com")) return sourceUrl;

    const resizedPath = url.pathname.replace(
      /\/wa\/images\/biens\//,
      `/${Math.round(width)}xauto/images/biens/`,
    );
    if (resizedPath === url.pathname) return sourceUrl;

    url.pathname = resizedPath;
    return url.toString();
  } catch {
    return sourceUrl;
  }
}

export function getPropertyImageSrcSet(
  sourceUrl: string,
  widths: readonly number[] = DEFAULT_IMAGE_WIDTHS,
): string | undefined {
  const candidates = widths.map((width) => {
    const imageUrl = getPropertyImageUrl(sourceUrl, width);
    return imageUrl === sourceUrl ? null : `${imageUrl} ${width}w`;
  });
  const available = candidates.filter((candidate): candidate is string => candidate !== null);

  return available.length > 0 ? available.join(", ") : undefined;
}
