# Repo Creation Steps

1. Install homebrew and yarn
`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`

2. Install fnm (Fast Node Manager)
`brew install fnm`

3. Add fnm to zshrc
```
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc
source ~/.zshrc
``` 

4. Install Node.js
`fnm install --lts`
`fnm use --install-if-missing lts-latest`

5. Verify Node Version
`node --version`
`npm --version`

6. Install yarn
`npm install -g yarn`

7. Install next with some opinions (`ESLint` yes, `React Compiler` no)
`npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --use-pnpm`

8. Install deps for server-state, schema validation, and client state
`yarn add @tanstack/react-query zod zustand`

9. Form handling
`yarn add react-hook-form @hookform/resolvers`

10. Style Composition
`yarn add clsx class-variance-authority`

11. Typescript > Node Globals Access and Code Formatting
`yarn add -D @types/node prettier prettier-plugin-tailwindcss`

12. Additional
`yarn add tailwind-merge`

13. Use yarn instead of pnpm
```
rm pnpm-lock.yaml
yarn install
```