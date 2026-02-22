"use client";

export function StrengthDetail({ detail }: { detail: Record<string, unknown> }) {
  const focus = String(detail.focus ?? detail.focusArea ?? "");
  const warmUp = detail.warmUp as string | undefined;
  const coolDown = detail.coolDown as string | undefined;
  const notes = detail.notes as string | undefined;
  const exercises = extractExercises(detail.exercises);

  return (
    <div className="space-y-3">
      {focus && (
        <span className="inline-flex rounded-md bg-orange-950/50 border border-orange-900/50 px-2 py-0.5 text-xs font-medium text-orange-400">
          {focus}
        </span>
      )}

      {warmUp && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-0.5">Warm-up</p>
          <p className="text-xs text-zinc-400">{warmUp}</p>
        </div>
      )}

      {exercises.length > 0 && (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500">
                <th className="text-left px-3 py-1.5 font-medium">Exercise</th>
                <th className="text-center px-2 py-1.5 font-medium">Sets</th>
                <th className="text-center px-2 py-1.5 font-medium">Reps</th>
                <th className="text-center px-2 py-1.5 font-medium">Weight</th>
                <th className="text-center px-2 py-1.5 font-medium">Rest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {exercises.map((ex, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-zinc-300 font-medium">{ex.name}</td>
                  <td className="text-center px-2 py-2 text-zinc-400">{ex.sets}</td>
                  <td className="text-center px-2 py-2 text-zinc-400">{ex.reps}</td>
                  <td className="text-center px-2 py-2 text-zinc-400">{ex.weight || "—"}</td>
                  <td className="text-center px-2 py-2 text-zinc-400">{ex.rest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {exercises.some(ex => ex.cues.length > 0) && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1">Form cues</p>
          <div className="space-y-1">
            {exercises.filter(ex => ex.cues.length > 0).map((ex, i) => (
              <div key={i}>
                <span className="text-xs text-zinc-300">{ex.name}:</span>
                <span className="text-xs text-zinc-500"> {ex.cues.join(", ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {coolDown && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-0.5">Cool-down</p>
          <p className="text-xs text-zinc-400">{coolDown}</p>
        </div>
      )}

      {notes && (
        <p className="text-xs text-zinc-500 italic">{notes}</p>
      )}
    </div>
  );
}

interface NormalizedExercise {
  name: string;
  sets: string;
  reps: string;
  weight: string;
  rest: string;
  cues: string[];
}

function extractExercises(raw: unknown): NormalizedExercise[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((ex: Record<string, unknown>) => ({
    name: String(ex.name ?? ex.exercise ?? "Unknown"),
    sets: String(ex.sets ?? ""),
    reps: String(ex.reps ?? ""),
    weight: String(ex.targetWeight ?? ex.weight ?? ""),
    rest: normalizeRest(ex.restSeconds ?? ex.rest),
    cues: toStringArray(ex.cues ?? ex.notes),
  }));
}

function normalizeRest(val: unknown): string {
  if (!val) return "—";
  if (typeof val === 'number') return `${val}s`;
  return String(val);
}

function toStringArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') return [val];
  return [];
}
