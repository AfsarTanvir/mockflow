export const msg = {
  required: (field: string) => `${field} is required`,
  minLength: (field: string, min: number) => `${field} must be at least ${min} characters`,
  maxLength: (field: string, max: number) => `${field} must not exceed ${max} characters`,
  min: (field: string, min: number) => `${field} must be at least ${min}`,
  max: (field: string, max: number) => `${field} must not exceed ${max}`,
  email: (field: string) => `${field} must be a valid email address`,
  unique: (field: string) => `${field} already exists, try another one`,
  startsWith: (field: string, prefix: string) => `${field} must start with "${prefix}"`,
  enum: (field: string, options: readonly string[]) =>
    `${field} must be one of: ${options.join(', ')}`,
};
