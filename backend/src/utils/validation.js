/**
 * Validates the password.
 * @param {any} password - The password.
 */
const validatePassword = (password) => {
    const regex = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    return regex.test(password);
};

module.exports = {
    validatePassword,
};
