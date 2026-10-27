import { Field } from "@/components/ui";

type Defaults = {
  admission_no: string; name: string; class_id: number; roll_no: number | null; gender: string; date_of_birth: string | null;
  guardian_name: string | null; guardian_phone: string | null; is_boarder: boolean; status?: string;
};

export function StudentFields({ classes, d, withStatus = false }: { classes: { id: number; name: string }[]; d?: Defaults; withStatus?: boolean }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <Field label="Admission number" htmlFor="s-adm"><input id="s-adm" name="admissionNo" className="input" required defaultValue={d?.admission_no} /></Field>
      <Field label="Full name" htmlFor="s-name"><input id="s-name" name="name" className="input" required defaultValue={d?.name} /></Field>
      <Field label="Class" htmlFor="s-class">
        <select id="s-class" name="classId" className="select" defaultValue={d?.class_id}>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </Field>
      <Field label="Roll number" htmlFor="s-roll"><input id="s-roll" name="rollNo" type="number" min={1} className="input" defaultValue={d?.roll_no ?? ""} /></Field>
      <Field label="Gender" htmlFor="s-gender">
        <select id="s-gender" name="gender" className="select" defaultValue={d?.gender ?? "F"}>
          <option value="F">Female</option><option value="M">Male</option><option value="O">Other</option>
        </select>
      </Field>
      <Field label="Date of birth" htmlFor="s-dob"><input id="s-dob" name="dateOfBirth" type="date" className="input" defaultValue={d?.date_of_birth ?? ""} /></Field>
      <Field label="Parent / guardian" htmlFor="s-gname"><input id="s-gname" name="guardianName" className="input" defaultValue={d?.guardian_name ?? ""} /></Field>
      <Field label="Guardian phone" htmlFor="s-gphone"><input id="s-gphone" name="guardianPhone" className="input" inputMode="tel" defaultValue={d?.guardian_phone ?? ""} /></Field>
      {withStatus && (
        <Field label="Status" htmlFor="s-status">
          <select id="s-status" name="status" className="select" defaultValue={d?.status ?? "active"}>
            <option value="active">Active</option><option value="inactive">Inactive (left)</option><option value="alumni">Alumni</option>
          </select>
        </Field>
      )}
      <label className="flex gap-2 items-center text-sm self-end pb-2"><input type="checkbox" name="isBoarder" defaultChecked={d?.is_boarder} className="accent-[#6c5ce7]" /> Hostel boarder</label>
    </div>
  );
}
