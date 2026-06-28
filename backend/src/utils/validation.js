/**
 * Validates if the password meets security requirements: minimum 8 characters, at least one number and one special character.
 * @param {string} password - The password string to validate.
 * @returns {boolean} True if password meets requirements, false otherwise.
 */
const validatePassword = (password) => {
    const regex = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    return regex.test(password);
};

module.exports = {
    validatePassword,
};
