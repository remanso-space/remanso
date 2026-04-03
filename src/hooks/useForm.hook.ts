import { ref } from "vue"
import { useRouter } from "vue-router"

export const useForm = () => {
  const userInput = ref("")
  const repoInput = ref("")
  const { push } = useRouter()

  const submit = () => {
    if (!userInput.value || !repoInput.value) {
      return
    }

    push({
      name: "FluxNoteView",
      params: {
        user: userInput.value,
        repo: repoInput.value
      }
    })
  }

  return {
    userInput,
    repoInput,
    submit
  }
}
