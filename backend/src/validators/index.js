const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const isValidUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
};

const isValidPassword = (password) => {
    return password && password.length >= 6;
};

const isValidContent = (content) => {
    return content && content.trim().length > 0;
};

module.exports = {
    isValidEmail,
    isValidUsername,
    isValidPassword,
    isValidContent,
};
