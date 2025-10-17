export const signupValidatorSchema = {
  name: {
    isLength: {
      options: {min: 3, max: 26},
      errorMessage: 'Name cannot be less than 3 characters'
    },
    notEmpty: {
      errorMessage: 'Name field cannot be left empty!'
    },
    isString: {
      errorMessage: 'Name must be a character e.g Samuel'
    }
  },
  password: {
    isLength: {
      options: {min: 5, max: 24},
      errorMessage: 'Password must be in the range of 5 - 24 characters long'
    },
    notEmpty: {
      errorMessage: "Password field cannot be left empty!"
    }
  },
  email: {
    notEmpty: {
      errorMessage: "Email field cannot be left empty!"
    },
    isString: {
      errorMessage: "Email must be a character not numbers or special characters"
    }
  }
}