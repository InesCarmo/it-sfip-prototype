const todayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

export function computeTemporalCallState(input) {
  const today = todayUtc();
  const openedAt = input.openedAt ? new Date(`${input.openedAt}T00:00:00Z`) : null;
  const deadlineAt = input.deadlineAt ? new Date(`${input.deadlineAt}T23:59:59Z`) : null;

  if (deadlineAt && deadlineAt.getTime() < today.getTime()) return "Encerrada";
  if (openedAt && openedAt.getTime() > today.getTime()) return "Prevista";
  return "Aberta";
}

export function computeDaysRemaining(deadlineAt) {
  if (!deadlineAt) return null;
  const today = todayUtc();
  const deadline = new Date(`${deadlineAt}T23:59:59Z`);
  return Math.ceil((deadline.getTime() - today.getTime()) / 86400000);
}
