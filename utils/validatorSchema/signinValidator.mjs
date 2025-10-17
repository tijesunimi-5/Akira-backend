export const signinValidatorSchema = {
  email: {
    notEmpty: {
      errorMessage: "Email field cannot be left empty",
    },
    isString: {
      errorMessage:
        "Email must be a character not numbers or special characters",
    },
  },
  password: {
    isLength: {
      options: { min: 5, max: 24 },
      errorMessage: "Password must be in the range of 5 - 24 characters",
    },
    notEmpty: {
      errorMessage: "Password field cannot be left empty",
    },
  },
};
