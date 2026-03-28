#!/usr/bin/env node

// Script pour changer facilement le thème sombre de l'application Remanso
// Usage: pnpm run theme:dark [theme-name]

import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

import { commitTheme } from "./change-theme"

// Chemins vers les fichiers
const themeConfigPath = join(__dirname, "..", "src", "theme.config.ts")
const appCssPath = join(__dirname, "..", "src", "styles", "app.css")

// Vérifier les arguments
if (process.argv.length < 3) {
  console.log("Usage: pnpm run theme:dark [theme-name]")
  console.log("Exemple: pnpm run theme:dark business")
  process.exit(1)
}

// Mode fixé à dark pour ce script
const mode = "dark"
const newTheme = process.argv[2] // nom du nouveau thème

// Lire le contenu actuel du fichier de configuration
let themeConfigContent = readFileSync(themeConfigPath, "utf8")

// Remplacer la valeur du thème sombre
themeConfigContent = themeConfigContent.replace(
  /dark:\s*['"][^'"]*['"],/,
  `dark: '${newTheme}',`
)

// Écrire le contenu mis à jour dans le fichier
writeFileSync(themeConfigPath, themeConfigContent)

// Mettre à jour également le fichier app.css pour le thème --prefersdark
let appCssContent = readFileSync(appCssPath, "utf8")
appCssContent = appCssContent.replace(
  /(\s+)([a-zA-Z0-9-]+)(\s+--prefersdark;)/,
  `$1${newTheme}$3`
)
writeFileSync(appCssPath, appCssContent)

commitTheme(mode, newTheme)

console.log(`Thème ${mode} mis à jour avec succès vers: ${newTheme}`)
process.exit(0)
