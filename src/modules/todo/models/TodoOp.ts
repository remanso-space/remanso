// A pending change to todo.txt, expressed as intent rather than as a file
// blob. Replaying intents onto whatever the remote holds is what lets a
// checkbox toggled offline survive a commit someone else pushed meanwhile.

// Tasks in todo.txt carry no identity, so a task is addressed by its body plus
// which of the same-bodied tasks it is. Body excludes the completion marker,
// dates and priority, so completing or re-prioritising a task keeps its key.
export interface TaskKey {
  body: string
  occurrence: number
}

export type TodoOp =
  | { id: string; type: "set"; key: TaskKey; raw: string }
  | { id: string; type: "delete"; key: TaskKey }
  | { id: string; type: "add"; raw: string }
