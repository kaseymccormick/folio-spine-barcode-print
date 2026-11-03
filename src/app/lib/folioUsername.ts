// FOLIO usernames for this deployment are institutional addresses ending in .edu.
export function isEduUsername(username: string): boolean {
  return /\.edu$/i.test(username.trim());
}
