module.exports = {
  stories: ["../src/**/*.stories.@(js|jsx|ts|tsx)"],

  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-links",
    "@storybook/addon-interactions",
    "@chromatic-com/storybook"
  ],

  framework: {
    name: "@storybook/react-vite",
    options: {}
  },

  core: {
    builder: "storybook-builder-vite"
  },

  docs: {}
};
