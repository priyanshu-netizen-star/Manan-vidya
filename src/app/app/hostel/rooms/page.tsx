import { ActionButton, JsonForm } from "@/components/forms";
import { Card, Field, PageHeader, SampleDataTag } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { isPresentation } from "@/lib/config";
import { getDb } from "@/lib/db";

export const metadata = { title: "Rooms & beds" };

export default async function RoomsPage() {
  await requirePageUser("hostel.manage");
  const db = await getDb();
  const beds = await db.query<{ bed_id: number; block: string; room_no: string; label: string; alloc_id: number | null; student: string | null; class_name: string | null }>(
    `SELECT b.id AS bed_id, r.block, r.room_no, b.label, ba.id AS alloc_id, s.name AS student, c.name AS class_name
       FROM hostel_beds b JOIN hostel_rooms r ON r.id = b.room_id
       LEFT JOIN bed_allocations ba ON ba.bed_id = b.id AND ba.to_date IS NULL
       LEFT JOIN students s ON s.id = ba.student_id LEFT JOIN classes c ON c.id = s.class_id
      ORDER BY r.block, r.room_no, b.label`,
  );
  const boarders = await db.query<{ id: number; name: string; has_bed: boolean }>(
    `SELECT s.id, s.name, EXISTS (SELECT 1 FROM bed_allocations ba WHERE ba.student_id = s.id AND ba.to_date IS NULL) AS has_bed
       FROM students s WHERE s.is_boarder AND s.status = 'active' ORDER BY has_bed, s.name`,
  );
  const rooms = new Map<string, typeof beds>();
  for (const b of beds) rooms.set(`${b.block}|${b.room_no}`, [...(rooms.get(`${b.block}|${b.room_no}`) ?? []), b]);
  const free = beds.filter((b) => !b.alloc_id);
  return (
    <div>
      <PageHeader eyebrow="Hostel" title="Rooms and beds" description={`${beds.length - free.length} of ${beds.length} beds occupied.`} actions={isPresentation() ? <SampleDataTag /> : undefined} />
      <div className="grid xl:grid-cols-[1fr_22rem] gap-5 items-start">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...rooms.entries()].map(([key, list]) => {
            const [block, room] = key.split("|");
            return (
              <Card key={key} title={`${room}`} actions={<span className="text-xs text-muted">{block}</span>}>
                <ul className="space-y-2">
                  {list.map((b) => (
                    <li key={b.bed_id} className="flex items-center justify-between gap-2 text-sm">
                      <span><span className="text-muted mr-1.5">Bed {b.label}</span>{b.student ? <>{b.student}<span className="text-xs text-muted ml-1">{b.class_name}</span></> : <span className="text-good">Free</span>}</span>
                      {b.alloc_id && <ActionButton endpoint={`/api/hostel/allocations/${b.alloc_id}`} method="DELETE" label="Vacate" confirm={`Vacate bed ${b.label} in ${room}?`} />}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
        <Card title="Allocate or move a student">
          <JsonForm endpoint="/api/hostel/allocations" submitLabel="Allocate" successMessage="Bed allocated.">
            <Field label="Boarder" htmlFor="al-st" hint="Students without a bed are listed first. Choosing a student who already has a bed moves them.">
              <select id="al-st" name="studentId" className="select">{boarders.map((b) => <option key={b.id} value={b.id}>{b.name}{b.has_bed ? "" : " (no bed)"}</option>)}</select>
            </Field>
            <Field label="Free bed" htmlFor="al-bed">
              <select id="al-bed" name="bedId" className="select">{free.map((b) => <option key={b.bed_id} value={b.bed_id}>{b.block} · {b.room_no} · bed {b.label}</option>)}</select>
            </Field>
          </JsonForm>
        </Card>
      </div>
    </div>
  );
}
