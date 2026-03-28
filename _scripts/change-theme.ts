import { execSync } from "child_process"

export const commitTheme = (mode: string, newTheme: string) => {
  // Créer un commit avec les changements
  try {
    // Ajouter tous les fichiers modifiés
    execSync("git add .", { stdio: "inherit" })

    // Créer le commit avec le message approprié
    const commitMessage = `design: change ${mode} theme to ${newTheme}`
    execSync(`git commit -m "${commitMessage}"`, { stdio: "inherit" })

    console.log(`Commit créé avec succès: "${commitMessage}"`)

    execSync(`git push`, { stdio: "inherit" })

    console.log(`Push sur origin`)
  } catch (error) {
    console.error("Erreur lors de la création du commit:", error)
    process.exit(1)
  }
}
