import { useState } from "react";
import { ROLES } from "./mockData.js";

export const NOW = { date: "Nov 13, 2026", time: "Just now" };

export const makeId = (prefix, base, span) =>
  `${prefix}-${Math.floor(base + Math.random() * span)}`;

/** Everything a view needs to know about the signed-in role, in one place. */
export function getScope(roleKey) {
  const role = ROLES[roleKey] || ROLES.dept_admin;
  const { user } = role;
  const isEmployee = roleKey === "employee";

  const byDept = (items) =>
    items.filter((i) => i.department === user.department);

  return {
    role,
    user,
    isEmployee,
    byDept,
    wallets: (list) =>
      list.filter((w) => w.members.some((m) => m.userId === user.id)),
    approvals: (list) => list.filter((a) => a.requesterId === user.id),
    transactions: (list) =>
      list.filter((t) => t.actor === user.name || t.wallet.includes("Rafi")),
  };
}

/** Array state with the few operations the dashboard needs. */
export function useList(initial) {
  const [items, setItems] = useState(initial);
  const apply = (patch, x) => ({
    ...x,
    ...(typeof patch === "function" ? patch(x) : patch),
  });
  return [
    items,
    {
      add: (item) => setItems((p) => [item, ...p]),
      patch: (id, patch) =>
        setItems((p) => p.map((x) => (x.id === id ? apply(patch, x) : x))),
      patchAll: (patch, match = () => true) =>
        setItems((p) => p.map((x) => (match(x) ? apply(patch, x) : x))),
      remove: (id) => setItems((p) => p.filter((x) => x.id !== id)),
      upsert: (item) =>
        setItems((p) =>
          p.some((x) => x.id === item.id)
            ? p.map((x) => (x.id === item.id ? item : x))
            : [item, ...p],
        ),
    },
  ];
}
