/** Mirrors `@MinLength(8)` on the API's `UpdateUserDto` / `CreateUserDto`. */
export const USER_PASSWORD_MIN_LENGTH = 8;

export type PasswordChange = { ok: true; password?: string } | { ok: false; error: 'tooShort' };

/**
 * Decides what the user form should do with the password field.
 *
 * Creating a user requires a password. Editing treats an empty field as "keep
 * the current one", but a value that is too short has to be reported: dropping
 * it silently let the save return 200 while the password never changed.
 */
export function resolvePasswordChange(password: string, isEditing: boolean): PasswordChange {
  if (isEditing && password.length === 0) return { ok: true };
  if (password.length < USER_PASSWORD_MIN_LENGTH) {
    return { ok: false, error: 'tooShort' };
  }
  return { ok: true, password };
}
