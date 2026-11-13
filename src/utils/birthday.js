// "YYYY-MM-DD" → is it this person's birthday today (local date)?
export function isBirthday(dob, now = new Date()) {
  if (!dob) return false;
  const [, m, d] = dob.split('-').map(Number);
  return m === now.getMonth() + 1 && d === now.getDate();
}

export function age(dob, now = new Date()) {
  if (!dob) return null;
  const [y, m, d] = dob.split('-').map(Number);
  let a = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) a--;
  return a;
}
