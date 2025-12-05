// Validation utilities

const isValidStudentRegNo = (regNo) => {
  return /^\d{9}$/.test(regNo);
};

const isValidStaffUID = (uid) => {
  return /^\d{5}$/.test(uid);
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPassword = (password) => {
  // Minimum 8 characters, at least one letter and one number
  return password.length >= 8 && /[a-zA-Z]/.test(password) && /\d/.test(password);
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim();
};

module.exports = {
  isValidStudentRegNo,
  isValidStaffUID,
  isValidEmail,
  isValidPassword,
  sanitizeInput
};
