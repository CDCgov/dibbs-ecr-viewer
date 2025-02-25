module.exports = {
  plugins: [
    "postcss-discard-comments",
    "postcss-flexbugs-fixes",
    [
      "postcss-preset-env",
      {
        autoprefixer: {
          flexbox: "no-2009",
        },
        stage: 3,
        features: {
          "custom-properties": false,
        },
      },
    ],
    [
      "@fullhuman/postcss-purgecss",
      {
        content: ["./**/*.{js,jsx,ts,tsx}"],
        fontFace: true,
        safelist: ["html", "body", /section__line/, /loading-blob/],
      },
    ],
  ],
};
