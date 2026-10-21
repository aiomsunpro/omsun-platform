import { requireStaff } from "@/lib/auth";
import type { FieldOption, ProfileField } from "@/lib/yojana";
import { ActionForm } from "@/components/action-form";
import { Card, Field, inputClass, PageTitle } from "@/components/ui";
import { addQuestion, updateQuestion } from "./actions";

const BLOCKS: Record<number, string> = {
  1: "Basic identity",
  2: "Social category",
  3: "Family and income",
  4: "Occupation",
  5: "Land and housing",
  6: "Life situation",
  7: "Education",
  8: "Existing benefits",
  9: "Documents held",
};

const KIND_LABEL: Record<ProfileField["kind"], string> = {
  number: "Number",
  band: "Range (bands)",
  choice: "Pick one",
  multi: "Pick several",
  yes_no: "Yes / No",
  date: "Date",
};

const optionLines = (options: FieldOption[]) =>
  options
    .map((o) => [o.value, o.en, o.mr, o.hi ?? "", o.min ?? "", o.max ?? ""].join(" | ").replace(/( \| )+$/, ""))
    .join("\n");

export default async function ProfileQuestionsPage() {
  const { supabase, profile } = await requireStaff(["owner", "manager"]);
  const { data: questions } = await supabase
    .from("profile_fields")
    .select("*")
    .order("block")
    .order("sort_order")
    .returns<ProfileField[]>();
  const owner = profile.role === "owner";
  const blocks = [...new Set((questions ?? []).map((q) => q.block))];

  return (
    <>
      <PageTitle title="Yojana Profile Questions" />
      <p className="mb-6 text-sm text-gray-600">
        The questions retailers ask a family during a Yojana check, in this order. Scheme rules refer to them by their
        key. {owner ? "Rewording a question changes it in the apps right away; schemes are not affected." : "Only the owner can change them."}
      </p>

      {blocks.map((b) => (
        <div key={b} className="mb-8">
          <h2 className="mb-3 font-semibold text-blue-950">{b}. {BLOCKS[b] ?? "Other"}</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {questions
              ?.filter((q) => q.block === b)
              .map((q) => (
                <Card key={q.key}>
                  <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-800">{q.key}</code>
                    <span>{q.scope === "household" ? "Asked once per family" : "Asked for each person"}</span>
                    <span>· {KIND_LABEL[q.kind]}</span>
                    {!q.is_active && <span className="font-medium text-red-700">· Hidden</span>}
                  </div>
                  {owner ? (
                    <ActionForm action={updateQuestion} submitLabel="Save">
                      <input type="hidden" name="key" value={q.key} />
                      <QuestionFields q={q} />
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="is_active" defaultChecked={q.is_active} /> Ask this question
                      </label>
                    </ActionForm>
                  ) : (
                    <div className="text-sm">
                      <p className="font-medium">{q.label_en}</p>
                      <p>{q.label_mr}</p>
                      {q.options.length > 0 && (
                        <p className="mt-1 text-gray-600">{q.options.map((o) => o.en).join(" · ")}</p>
                      )}
                    </div>
                  )}
                </Card>
              ))}
          </div>
        </div>
      ))}

      {owner && (
        <Card title="Add a question">
          <ActionForm action={addQuestion} submitLabel="Add question">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Key * (like widow_pension)">
                <input name="key" required pattern="[a-z][a-z0-9_]{1,40}" className={inputClass} />
              </Field>
              <Field label="Asked">
                <select name="scope" className={inputClass}>
                  <option value="member">For each person</option>
                  <option value="household">Once per family</option>
                </select>
              </Field>
              <Field label="Answer type">
                <select name="kind" className={inputClass}>
                  {Object.entries(KIND_LABEL).map(([k, l]) => (
                    <option key={k} value={k}>{l}</option>
                  ))}
                </select>
              </Field>
            </div>
            <QuestionFields />
          </ActionForm>
        </Card>
      )}
    </>
  );
}

function QuestionFields({ q }: { q?: ProfileField }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Question (English) *">
          <input name="label_en" required defaultValue={q?.label_en} className={inputClass} />
        </Field>
        <Field label="प्रश्न (मराठी) *">
          <input name="label_mr" required defaultValue={q?.label_mr} className={inputClass} />
        </Field>
        <Field label="प्रश्न (हिंदी)">
          <input name="label_hi" defaultValue={q?.label_hi ?? ""} className={inputClass} />
        </Field>
        {q && (
          <>
            <Field label="Help (English)">
              <input name="help_en" defaultValue={q.help_en ?? ""} className={inputClass} />
            </Field>
            <Field label="मदत (मराठी)">
              <input name="help_mr" defaultValue={q.help_mr ?? ""} className={inputClass} />
            </Field>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Block">
            <input name="block" type="number" min="1" max="20" defaultValue={q?.block ?? 1} className={inputClass} />
          </Field>
          <Field label="Order">
            <input name="sort_order" type="number" defaultValue={q?.sort_order ?? 0} className={inputClass} />
          </Field>
        </div>
      </div>
      {(!q || ["band", "choice", "multi"].includes(q.kind)) && (
        <Field label="Answers, one per line: value | English | मराठी | हिंदी | min | max (min and max for ranges only)">
          <textarea
            name="options"
            rows={Math.max(3, (q?.options.length ?? 0) + 1)}
            defaultValue={q ? optionLines(q.options) : ""}
            className={`${inputClass} font-mono text-xs`}
          />
        </Field>
      )}
    </>
  );
}
