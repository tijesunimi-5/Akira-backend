export const passwordValidator = (password) => {
  const errors = [];
  const requirements = {
    minLength: password.length >= 8,
    maxLength: password.length <= 24,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[@$!%*?&_-]/.test(password),
  };

  if (!requirements.minLength)
    errors.push("Password must be at least 8 characters long");
  if (!requirements.maxLength)
    errors.push("Password must be no more than 24 characters long");
  if (!requirements.hasUppercase)
    errors.push("Password must at least one uppercase letter");
  if (!requirements.hasLowercase)
    errors.push("Password must at least one lowercase letter");
  if (!requirements.hasNumber) errors.push("Password must at least one number");
  if (!requirements.hasSpecialChar)
    errors.push("Password must at least one special character");

  if (errors.length > 0) return { valid: false, errors };

  return { valid: true };
};

/**
 * 
 * const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,24}$/;
  if (!passwordRegex.test(password)) {
    return false;
  }
  return true;
 */
