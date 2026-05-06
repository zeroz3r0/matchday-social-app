/**
 * PostCSS config for @matchday/web.
 *
 * Tailwind v4 ships its PostCSS plugin separately as `@tailwindcss/postcss`.
 * That's the only plugin we need — autoprefixer is no longer required (v4
 * inlines its own vendor prefixing where necessary).
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
