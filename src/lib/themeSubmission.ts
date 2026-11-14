export function themeSubmissionLink(fileName: string, json: string) {
  const base = `https://github.com/SunkenInTime/t3-themes/new/main?filename=${encodeURIComponent(fileName)}`;
  const prefilled = `${base}&value=${encodeURIComponent(json)}`;
  // Keep large CSS payloads out of URLs that GitHub's request limits reject.
  const contentsPrefilled = prefilled.length <= 8_000;
  return { url: contentsPrefilled ? prefilled : base, contentsPrefilled };
}
