"use client";

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  targetWeight?: string;
  restSeconds: number;
  cues?: string[];
}

interface StrengthData {
  focus?: string;
  exercises?: Exercise[];
  warmUp?: string;
  coolDown?: string;
  notes?: string;
}

export function StrengthDetail({ detail }: { detail: Record<string, unknown> }) {
  const d = detail as unknown as StrengthData;

  return (
    <div className="space-y-3">
      {d.focus && (
        <span className="inline-flex rounded-md bg-orange-950/50 border border-orange-900/50 px-2 py-0.5 text-xs font-medium text-orange-400 capitalize">
          {d.focus} body
        </span>
      )}

      {/* Warm-up */}
      {d.warmUp && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-0.5">Warm-up</p>
          <p className="text-xs text-zinc-400">{d.warmUp}</p>
        </div>
      )}

      {/* Exercise table */}
      {d.exercises && d.exercises.length > 0 && (
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
              {d.exercises.map((ex, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-zinc-300 font-medium">{ex.name}</td>
                  <td className="text-center px-2 py-2 text-zinc-400">{ex.sets}</td>
                  <td className="text-center px-2 py-2 text-zinc-400">{ex.reps}</td>
                  <td className="text-center px-2 py-2 text-zinc-400">{ex.targetWeight ?? "—"}</td>
                  <td className="text-center px-2 py-2 text-zinc-400">{ex.restSeconds}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Exercise cues */}
      {d.exercises?.some(ex => ex.cues && ex.cues.length > 0) && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1">Form cues</p>
          <div className="space-y-1">
            {d.exercises.filter(ex => ex.cues && ex.cues.length > 0).map((ex, i) => (
              <div key={i}>
                <span className="text-xs text-zinc-300">{ex.name}:</span>
                {ex.cues!.map((cue, j) => (
                  <span key={j} className="text-xs text-zinc-500"> {cue}{j < ex.cues!.length - 1 ? "," : ""}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cool-down */}
      {d.coolDown && (
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-0.5">Cool-down</p>
          <p className="text-xs text-zinc-400">{d.coolDown}</p>
        </div>
      )}

      {/* Notes */}
      {d.notes && (
        <p className="text-xs text-zinc-500 italic">{d.notes}</p>
      )}
    </div>
  );
}
