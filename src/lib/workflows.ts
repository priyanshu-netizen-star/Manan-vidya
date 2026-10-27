/**
 * Status workflows. Every status change in the system is validated against these maps
 * on the server and recorded in status_history with the acting user.
 */

export const ENQUIRY_STATUSES = ["new", "contacted", "visit_scheduled", "application_submitted", "admitted", "closed"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];
export const ENQUIRY_LABEL: Record<EnquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  visit_scheduled: "Visit / interaction scheduled",
  application_submitted: "Application submitted",
  admitted: "Admitted",
  closed: "Closed",
};
export const ENQUIRY_FLOW: Record<EnquiryStatus, EnquiryStatus[]> = {
  new: ["contacted", "closed"],
  contacted: ["visit_scheduled", "application_submitted", "closed"],
  visit_scheduled: ["application_submitted", "contacted", "closed"],
  application_submitted: ["admitted", "closed"],
  admitted: [],
  closed: ["contacted"],
};

export const LEAVE_STATUSES = ["pending", "approved", "rejected", "checked_out", "returned", "cancelled"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];
export const LEAVE_LABEL: Record<LeaveStatus, string> = {
  pending: "Awaiting warden",
  approved: "Approved",
  rejected: "Rejected",
  checked_out: "Checked out",
  returned: "Returned",
  cancelled: "Cancelled",
};
/** Transitions a warden may make. A requester may only cancel their own pending request. */
export const LEAVE_FLOW: Record<LeaveStatus, LeaveStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["checked_out", "cancelled"],
  rejected: [],
  checked_out: ["returned"],
  returned: [],
  cancelled: [],
};

export const MAINT_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type MaintStatus = (typeof MAINT_STATUSES)[number];
export const MAINT_LABEL: Record<MaintStatus, string> = { open: "Open", in_progress: "In progress", resolved: "Resolved", closed: "Closed" };
export const MAINT_FLOW: Record<MaintStatus, MaintStatus[]> = {
  open: ["in_progress", "resolved"],
  in_progress: ["resolved", "open"],
  resolved: ["closed", "open"],
  closed: [],
};

export const TASK_STATUSES = ["open", "in_progress", "blocked", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_LABEL: Record<TaskStatus, string> = { open: "Open", in_progress: "In progress", blocked: "Blocked", done: "Done" };
export const TASK_FLOW: Record<TaskStatus, TaskStatus[]> = {
  open: ["in_progress", "blocked", "done"],
  in_progress: ["blocked", "done", "open"],
  blocked: ["in_progress", "open"],
  done: ["open"],
};

export function canTransition<S extends string>(flow: Record<S, S[]>, from: S, to: S): boolean {
  return flow[from]?.includes(to) ?? false;
}
