# Repo Creation Steps

1. Install homebrew and yarn

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. Install fnm (Fast Node Manager)

```bash
brew install fnm
```

3. Add fnm to zshrc

```bash
echo 'eval "$(fnm env --use-on-cd)"' >> ~/.zshrc
source ~/.zshrc
```

4. Install Node.js

```bash
fnm install --lts
fnm use --install-if-missing lts-latest
```

5. Verify Node Version

```bash
node --version
npm --version
```

6. Install yarn

```bash
npm install -g yarn
```

7. Install next with some opinions (`ESLint` yes, `React Compiler` no)

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --use-pnpm
```

8. Install deps for server-state, schema validation, and client state

```bash
yarn add @tanstack/react-query zod zustand
```

9. Form handling

```bash
yarn add react-hook-form @hookform/resolvers
```

10. Style Composition

```bash
yarn add clsx class-variance-authority
```

11. Typescript > Node Globals Access and Code Formatting

```bash
yarn add -D @types/node prettier prettier-plugin-tailwindcss
```

12. Additional

```bash
yarn add tailwind-merge
```

13. Use yarn instead of pnpm

```bash
rm pnpm-lock.yaml
yarn install
```

14. Install libs for 3D

```bash
yarn add @react-three/fiber @react-three/drei three
yarn add -D @types/three
```

15. Code quality tools (cycle detection, dead code analysis)

```bash
yarn add -D dpdm chokidar-cli ts-prune knip
```
