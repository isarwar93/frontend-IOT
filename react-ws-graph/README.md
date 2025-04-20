# Frontend IOT

A flexible frontend idea to visualize and analyse the IOT sensors data. It is a work in progress and hobby project. So, it will be updated slowly.

## Following technologies are being used

Vite + React + TypeScript + Tailwind CSS + Recharts.


## To run for the first time

```bash
npm install

npm install clsx tailwind-variants lucide-react

npx shadcn@latest init

npm install recharts classnames

npm install -D tailwindcss@3 postcss autoprefixer

npx tailwindcss init -p  

npm install --save-dev @types/node

npm install next-themes

npm install lucide-react

npm install recharts

npm install react-fps-stats

npm install html2canvas

npm install react-heatmap-grid
```



# To run the in development environment
```bash
npm run dev
```

# In the frontend, we'll assume sensor data comes in this format

type SensorMetadata = {
  id: string;
  name: string;
  type: 'temperature' | 'humidity' | 'voltage' | 'custom';
  unit: string;
};


# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
