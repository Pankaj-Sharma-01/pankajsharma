/**
 * Loads fonts that are licensed for desktop use only, for previewing them on
 * the local dev server. Never rendered in production builds, and the files in
 * public/fonts/local/ are git-ignored and stripped from out/ by `npm run build`.
 *
 * Ethnocentric (Typodermic): the free desktop EULA does not cover websites or
 * webfonts. Shipping it on the live site needs a Typodermic webfont license.
 */
const localFontFaces = `
@font-face {
  font-family: "Ethnocentric";
  src: url("/fonts/local/Ethnocentric-Regular.otf") format("opentype");
  font-display: swap;
}
`;

export function LocalFonts() {
  if (process.env.NODE_ENV !== "development") return null;
  return <style>{localFontFaces}</style>;
}
